use crate::{
    discovery::DiscoveryState,
    favorites::FavoritesStore,
    models::{now_unix, DeviceInfo, DeviceType},
};

#[tokio::test]
async fn test_device_discovery_and_timeout() {
    let discovery = DiscoveryState::new();
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
