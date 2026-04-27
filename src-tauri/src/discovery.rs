use crate::{
    favorites::FavoritesStore,
    models::{now_unix, AppSettings, DeviceInfo, DeviceType, NetworkStatus},
    settings::SettingsStore,
};
use anyhow::Result;
use futures_util::{stream::FuturesUnordered, StreamExt};
use local_ip_address::list_afinet_netifas;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::{
    collections::{HashMap, HashSet},
    net::{IpAddr, Ipv4Addr},
    sync::Arc,
    time::Duration,
};
use tauri::{AppHandle, Emitter};
use tokio::{sync::RwLock, task::JoinHandle};

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

    pub async fn scan_local_subnets(
        &self,
        settings: &SettingsStore,
        favorites: &FavoritesStore,
    ) -> Vec<DeviceInfo> {
        let settings_value = settings.get().await;
        let local_ips = local_ipv4_addrs();
        let local_ip_set: HashSet<Ipv4Addr> = local_ips.iter().copied().collect();
        let port = settings_value.port;
        let client = match reqwest::Client::builder()
            .timeout(Duration::from_millis(650))
            .build()
        {
            Ok(client) => client,
            Err(_) => return self.devices(favorites).await,
        };

        let mut probes = FuturesUnordered::new();
        for ip in local_ips.into_iter().take(3) {
            let octets = ip.octets();
            for host in 1..=254_u8 {
                let candidate = Ipv4Addr::new(octets[0], octets[1], octets[2], host);
                if local_ip_set.contains(&candidate) {
                    continue;
                }
                let client = client.clone();
                probes.push(async move {
                    let url = format!("http://{candidate}:{port}/api/v1/info");
                    let response = client.get(url).send().await.ok()?.error_for_status().ok()?;
                    response.json::<DeviceInfo>().await.ok()
                });
            }
        }

        while let Some(device) = probes.next().await {
            if let Some(device) = device {
                if device.id != self.local_device_id {
                    self.upsert_peer(DeviceInfo {
                        last_seen: now_unix(),
                        ..device
                    })
                    .await;
                }
            }
        }

        self.devices(favorites).await
    }

    pub async fn network_status(&self, settings: &SettingsStore) -> NetworkStatus {
        let settings_value = settings.get().await;
        let local_ips = local_ips();
        let hosting = self.runtime_port.read().await.is_some();
        let discovery_running = self.mdns.read().await.is_some();
        let advertising = self.advertised_fullname.read().await.is_some() && !settings_value.hidden;
        let port = self
            .runtime_port
            .read()
            .await
            .unwrap_or(settings_value.port);
        let mut issues = Vec::new();

        if local_ips.is_empty() {
            issues.push("No LAN IPv4 address detected".to_string());
        }
        if !hosting {
            issues.push("File receiver is not hosting yet".to_string());
        }
        if !discovery_running {
            issues.push("mDNS discovery is not running yet".to_string());
        }
        if settings_value.hidden {
            issues.push("Device is hidden from discovery".to_string());
        } else if hosting && discovery_running && !advertising {
            issues.push("Device is not advertising on the LAN".to_string());
        }

        NetworkStatus {
            device_name: settings_value.device_name,
            hidden: settings_value.hidden,
            hosting,
            discovery_running,
            advertising,
            local_ips,
            port,
            service_type: SERVICE_TYPE.to_string(),
            issues,
        }
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
    local_ipv4_addrs()
        .into_iter()
        .map(|ip| ip.to_string())
        .collect()
}

fn local_ipv4_addrs() -> Vec<Ipv4Addr> {
    match list_afinet_netifas() {
        Ok(addrs) => addrs
            .into_iter()
            .filter_map(|(name, ip)| match ip {
                IpAddr::V4(v4) if usable_lan_interface(&name) && usable_lan_ipv4(v4) => Some(v4),
                _ => None,
            })
            .collect(),
        Err(_) => Vec::new(),
    }
}

fn usable_lan_ipv4(ip: Ipv4Addr) -> bool {
    !ip.is_loopback() && !ip.is_link_local() && !ip.is_broadcast() && !ip.is_unspecified()
}

fn usable_lan_interface(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    let virtual_prefixes = [
        "awdl", "br-", "bridge", "docker", "llw", "lo", "tap", "tun", "utun", "veth", "virbr",
        "vmnet", "wg", "zt",
    ];
    !virtual_prefixes
        .iter()
        .any(|prefix| name == *prefix || name.starts_with(prefix))
}
