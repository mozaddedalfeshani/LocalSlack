use crate::{
    favorites::FavoritesStore,
    models::{DeviceInfo, DeviceType},
};

fn device() -> DeviceInfo {
    DeviceInfo {
        id: "peer".into(),
        name: "Peer".into(),
        emoji: "🚀".into(),
        ip: "192.168.1.2".into(),
        port: 53317,
        device_type: DeviceType::Desktop,
        is_favorite: false,
        last_seen: 1,
    }
}

#[test]
fn test_favorites_persist_and_remove() {
    let db = sled::Config::new()
        .temporary(true)
        .open()
        .expect("temporary db");
    let store = FavoritesStore::open(db.open_tree("favorites").expect("favorites tree"));
    store.add_favorite(device()).expect("add");
    assert!(store.is_favorite("peer").expect("exists"));
    assert_eq!(store.get_favorites().expect("list").len(), 1);
    store.remove_favorite("peer").expect("remove");
    assert!(!store.is_favorite("peer").expect("missing"));
}
