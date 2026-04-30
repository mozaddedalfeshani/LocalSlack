use crate::{
    discovery::DiscoveryState,
    favorites::FavoritesStore,
    models::{now_unix, DeviceInfo, DeviceType},
};
use mdns_sd::ServiceInfo;
use std::collections::HashMap;

#[tokio::test]
async fn test_device_discovery_and_timeout() {
    let discovery = DiscoveryState::new("local-device".into());
    discovery
        .upsert_peer(DeviceInfo {
            id: "peer".into(),
            name: "Peer".into(),
            emoji: "🚀".into(),
            ip: "192.168.1.2".into(),
            port: 53317,
            device_type: DeviceType::Desktop,
            is_favorite: false,
            last_seen: now_unix(),
        })
        .await;
    let db = sled::Config::new()
        .temporary(true)
        .open()
        .expect("temporary db");
    let favorites = FavoritesStore::open(db.open_tree("favorites").expect("favorites tree"));
    favorites
        .add_favorite(DeviceInfo {
            id: "offline-favorite".into(),
            name: "Offline Favorite".into(),
            emoji: "⭐".into(),
            ip: "192.168.1.200".into(),
            port: 53317,
            device_type: DeviceType::Desktop,
            is_favorite: false,
            last_seen: now_unix(),
        })
        .expect("favorite stored");
    assert_eq!(discovery.devices(&favorites).await.len(), 1);
    discovery
        .upsert_peer(DeviceInfo {
            id: "old".into(),
            name: "Old".into(),
            emoji: "🌙".into(),
            ip: "192.168.1.3".into(),
            port: 53317,
            device_type: DeviceType::Desktop,
            is_favorite: false,
            last_seen: now_unix().saturating_sub(31),
        })
        .await;
    discovery.remove_stale().await;
    assert_eq!(discovery.devices(&favorites).await.len(), 1);
}

#[test]
fn test_device_info_fields() {
    let device = DeviceInfo {
        id: "id".into(),
        name: "Name".into(),
        emoji: "⭐".into(),
        ip: "127.0.0.1".into(),
        port: 53317,
        device_type: DeviceType::Desktop,
        is_favorite: false,
        last_seen: 1,
    };
    assert_eq!(device.port, 53317);
    assert_eq!(device.name, "Name");
}

#[test]
fn test_service_info_maps_to_device() {
    let discovery = DiscoveryState::new("local-device".into());
    let mut props = HashMap::new();
    props.insert("id".to_string(), "peer-id".to_string());
    props.insert("name".to_string(), "Linux Laptop".to_string());
    props.insert("emoji".to_string(), "⭐".to_string());
    props.insert("device_type".to_string(), "Desktop".to_string());
    let service = ServiceInfo::new(
        "_localslack._tcp.local.",
        "LocalSlack Linux Laptop",
        "peer.local.",
        "192.168.1.20",
        53317,
        props,
    )
    .expect("service info");

    let device = discovery
        .device_from_service(&service)
        .expect("device from service");

    assert_eq!(device.id, "peer-id");
    assert_eq!(device.name, "Linux Laptop");
    assert_eq!(device.emoji, "⭐");
    assert_eq!(device.ip, "192.168.1.20");
    assert_eq!(device.port, 53317);
    assert_eq!(device.device_type, DeviceType::Desktop);
}
