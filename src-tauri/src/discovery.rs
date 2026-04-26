use crate::{
    favorites::FavoritesStore,
    models::{now_unix, DeviceInfo, DeviceType},
    settings::SettingsStore,
};
use anyhow::Result;
use local_ip_address::list_afinet_netifas;
use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::{collections::HashMap, net::IpAddr, sync::Arc, time::Duration};
use tauri::{AppHandle, Emitter};
use tokio::{sync::RwLock, task::JoinHandle};
use uuid::Uuid;

#[derive(Clone)]
pub struct DiscoveryState {
    local_device_id: String,
    devices: Arc<RwLock<HashMap<String, DeviceInfo>>>,
    mdns: Arc<RwLock<Option<ServiceDaemon>>>,
}

impl DiscoveryState {
    pub fn new() -> Self {
        Self {
            local_device_id: Uuid::new_v4().to_string(),
            devices: Arc::new(RwLock::new(HashMap::new())),
            mdns: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn local_device(&self, settings: &SettingsStore) -> DeviceInfo {
        let settings = settings.get().await;
        let ip = local_ips()
            .first()
            .cloned()
            .unwrap_or_else(|| "127.0.0.1".to_string());
        DeviceInfo {
            id: self.local_device_id.clone(),
            name: settings.device_name,
            ip,
            port: settings.port,
            device_type: DeviceType::Desktop,
            is_favorite: false,
            last_seen: now_unix(),
        }
    }

    pub async fn devices(&self, favorites: &FavoritesStore) -> Vec<DeviceInfo> {
        let mut merged: HashMap<String, DeviceInfo> = self.devices.read().await.clone();
        if let Ok(favorite_devices) = favorites.get_favorites() {
            for mut favorite in favorite_devices {
                if let Some(online) = merged.get_mut(&favorite.id) {
                    online.is_favorite = true;
                } else {
                    favorite.is_favorite = true;
                    merged.insert(favorite.id.clone(), favorite);
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

    pub async fn remove_stale(&self) {
        let cutoff = now_unix().saturating_sub(30);
        self.devices
            .write()
            .await
            .retain(|_, device| device.last_seen >= cutoff);
    }

    pub async fn start(
        &self,
        app: AppHandle,
        settings: SettingsStore,
        favorites: FavoritesStore,
    ) -> Result<JoinHandle<()>> {
        self.register_service(&settings).await?;
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

    pub async fn register_service(&self, settings: &SettingsStore) -> Result<()> {
        let settings_value = settings.get().await;
        if settings_value.hidden {
            return Ok(());
        }
        let daemon = ServiceDaemon::new()?;
        let host = format!("{}.local.", self.local_device_id);
        let service_name = format!("SwiftShare {}", settings_value.device_name);
        let ips = local_ips();
        let mut props = HashMap::new();
        props.insert("id".to_string(), self.local_device_id.clone());
        props.insert("name".to_string(), settings_value.device_name);
        props.insert("device_type".to_string(), "Desktop".to_string());
        let service = ServiceInfo::new(
            "_swiftshare._tcp.local.",
            &service_name,
            &host,
            ips.iter()
                .map(String::as_str)
                .collect::<Vec<_>>()
                .as_slice(),
            settings_value.port,
            props,
        )?;
        daemon.register(service)?;
        *self.mdns.write().await = Some(daemon);
        Ok(())
    }
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
