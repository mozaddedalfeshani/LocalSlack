use crate::{
    favorites::FavoritesStore,
    models::{now_unix, AppSettings, DeviceInfo, DeviceType},
    settings::SettingsStore,
};
use anyhow::Result;
use local_ip_address::list_afinet_netifas;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::{collections::HashMap, net::IpAddr, sync::Arc, time::Duration};
use tauri::{AppHandle, Emitter};
use tokio::{sync::RwLock, task::JoinHandle};
use uuid::Uuid;

const SERVICE_TYPE: &str = "_swiftshare._tcp.local.";

#[derive(Clone)]
pub struct DiscoveryState {
    local_device_id: String,
    devices: Arc<RwLock<HashMap<String, DeviceInfo>>>,
    mdns_names: Arc<RwLock<HashMap<String, String>>>,
    mdns: Arc<RwLock<Option<ServiceDaemon>>>,
    advertised_fullname: Arc<RwLock<Option<String>>>,
    receive_visible: Arc<RwLock<bool>>,
    runtime_port: Arc<RwLock<Option<u16>>>,
}

impl DiscoveryState {
    pub fn new(device_id: String) -> Self {
        Self {
            local_device_id: device_id,
            devices: Arc::new(RwLock::new(HashMap::new())),
            mdns_names: Arc::new(RwLock::new(HashMap::new())),
            mdns: Arc::new(RwLock::new(None)),
            advertised_fullname: Arc::new(RwLock::new(None)),
            receive_visible: Arc::new(RwLock::new(false)),
            runtime_port: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn local_device(&self, settings: &SettingsStore) -> DeviceInfo {
        let settings = settings.get().await;
        let port = self.runtime_port.read().await.unwrap_or(settings.port);
        let ip = local_ips()
            .first()
            .cloned()
            .unwrap_or_else(|| "127.0.0.1".to_string());
        DeviceInfo {
            id: self.local_device_id.clone(),
            name: settings.device_name,
            emoji: settings.device_emoji,
            ip,
            port,
            device_type: DeviceType::Desktop,
            is_favorite: false,
            last_seen: now_unix(),
        }
    }

    pub async fn set_runtime_port(&self, port: u16) {
        *self.runtime_port.write().await = Some(port);
    }

    pub async fn devices(&self, favorites: &FavoritesStore) -> Vec<DeviceInfo> {
        let mut merged: HashMap<String, DeviceInfo> = self.devices.read().await.clone();
        if let Ok(favorite_devices) = favorites.get_favorites() {
            for favorite in favorite_devices {
                if let Some(online) = merged.get_mut(&favorite.id) {
                    online.is_favorite = true;
                }
            }
        }
        let mut devices: Vec<DeviceInfo> = merged.into_values().collect();
        devices.sort_by(|a, b| {
            b.is_favorite
                .cmp(&a.is_favorite)
                .then_with(|| b.last_seen.cmp(&a.last_seen))
        });
        devices
    }

    pub async fn upsert_peer(&self, device: DeviceInfo) {
        self.devices.write().await.insert(device.id.clone(), device);
    }

    pub async fn remove_peer(&self, id: &str) {
        self.devices.write().await.remove(id);
    }

    pub async fn remove_stale(&self) {
        let cutoff = now_unix().saturating_sub(30);
        self.devices
            .write()
            .await
            .retain(|_, device| device.last_seen >= cutoff);
    }

    pub async fn start(&self, app: AppHandle, favorites: FavoritesStore) -> Result<JoinHandle<()>> {
        let daemon = ServiceDaemon::new()?;
        *self.mdns.write().await = Some(daemon.clone());
        self.start_browser(daemon, app.clone(), favorites.clone())?;
        let state = self.clone();
        Ok(tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(5));
            loop {
                interval.tick().await;
                state.remove_stale().await;
                let devices = state.devices(&favorites).await;
                let _ = app.emit("devices-updated", devices);
            }
        }))
    }

    pub async fn set_receive_visible(&self, settings: &SettingsStore, visible: bool) -> Result<()> {
        *self.receive_visible.write().await = visible;
        self.apply_receive_visibility(settings).await
    }

    pub async fn apply_receive_visibility(&self, settings: &SettingsStore) -> Result<()> {
        let visible = *self.receive_visible.read().await;
        let settings_value = settings.get().await;
        let should_advertise = visible && !settings_value.hidden;
        let Some(daemon) = self.mdns.read().await.clone() else {
            return Ok(());
        };

        if !should_advertise {
            if let Some(fullname) = self.advertised_fullname.write().await.take() {
                unregister_service(daemon, fullname);
            }
            return Ok(());
        }

        let port = self
            .runtime_port
            .read()
            .await
            .unwrap_or(settings_value.port);
        let service = self.service_info(settings_value, port)?;
        let fullname = service.get_fullname().to_string();
        if self.advertised_fullname.read().await.as_deref() == Some(fullname.as_str()) {
            return Ok(());
        }
        if let Some(old_fullname) = self.advertised_fullname.write().await.take() {
            unregister_service(daemon.clone(), old_fullname);
        }
        daemon.register(service)?;
        *self.advertised_fullname.write().await = Some(fullname);
        Ok(())
    }

    fn service_info(&self, settings: AppSettings, port: u16) -> Result<ServiceInfo> {
        let host = format!("{}.local.", self.local_device_id);
        let service_name = format!("SwiftShare {}", settings.device_name);
        let mut ips = local_ips();
        if ips.is_empty() {
            ips.push("127.0.0.1".to_string());
        }
        let mut props = HashMap::new();
        props.insert("id".to_string(), self.local_device_id.clone());
        props.insert("name".to_string(), settings.device_name);
        props.insert("emoji".to_string(), settings.device_emoji);
        props.insert("device_type".to_string(), "Desktop".to_string());
        Ok(ServiceInfo::new(
            SERVICE_TYPE,
            &service_name,
            &host,
            ips.iter()
                .map(String::as_str)
                .collect::<Vec<_>>()
                .as_slice(),
            port,
            props,
        )?
        .enable_addr_auto())
    }

    fn start_browser(
        &self,
        daemon: ServiceDaemon,
        app: AppHandle,
        favorites: FavoritesStore,
    ) -> Result<()> {
        let receiver = daemon.browse(SERVICE_TYPE)?;
        let state = self.clone();
        tokio::spawn(async move {
            while let Ok(event) = receiver.recv_async().await {
                match event {
                    ServiceEvent::ServiceResolved(info) => {
                        if let Some(device) = state.device_from_service(&info) {
                            state
                                .mdns_names
                                .write()
                                .await
                                .insert(info.get_fullname().to_string(), device.id.clone());
                            state.upsert_peer(device).await;
                            state.emit_devices(&app, &favorites).await;
                        }
                    }
                    ServiceEvent::ServiceRemoved(_, fullname) => {
                        if let Some(id) = state.mdns_names.write().await.remove(&fullname) {
                            state.remove_peer(&id).await;
                            state.emit_devices(&app, &favorites).await;
                        }
                    }
                    _ => {}
                }
            }
        });
        Ok(())
    }

    async fn emit_devices(&self, app: &AppHandle, favorites: &FavoritesStore) {
        let devices = self.devices(favorites).await;
        let _ = app.emit("devices-updated", devices);
    }

    pub(crate) fn device_from_service(&self, info: &ServiceInfo) -> Option<DeviceInfo> {
        let id = info.get_property_val_str("id")?.to_string();
        if id == self.local_device_id {
            return None;
        }
        let ip = info
            .get_addresses()
            .iter()
            .find(|ip| matches!(ip, IpAddr::V4(v4) if !v4.is_loopback()))
            .or_else(|| info.get_addresses().iter().find(|ip| ip.is_ipv4()))
            .map(ToString::to_string)?;
        let name = info
            .get_property_val_str("name")
            .filter(|name| !name.is_empty())
            .unwrap_or(info.get_fullname())
            .to_string();
        let emoji = info
            .get_property_val_str("emoji")
            .filter(|emoji| !emoji.is_empty())
            .unwrap_or("🚀")
            .to_string();
        let device_type = match info
            .get_property_val_str("device_type")
            .unwrap_or("Desktop")
            .to_ascii_lowercase()
            .as_str()
        {
            "mobile" => DeviceType::Mobile,
            "web" => DeviceType::Web,
            _ => DeviceType::Desktop,
        };
        Some(DeviceInfo {
            id,
            name,
            emoji,
            ip,
            port: info.get_port(),
            device_type,
            is_favorite: false,
            last_seen: now_unix(),
        })
    }
}

fn unregister_service(daemon: ServiceDaemon, fullname: String) {
    let Ok(receiver) = daemon.unregister(&fullname) else {
        return;
    };
    tokio::task::spawn_blocking(move || {
        let _ = receiver.recv_timeout(Duration::from_secs(2));
    });
}

pub fn local_ips() -> Vec<String> {
    match list_afinet_netifas() {
        Ok(addrs) => addrs
            .into_iter()
            .filter_map(|(_, ip)| match ip {
                IpAddr::V4(v4) if !v4.is_loopback() => Some(v4.to_string()),
                _ => None,
            })
            .collect(),
        Err(_) => Vec::new(),
    }
}
