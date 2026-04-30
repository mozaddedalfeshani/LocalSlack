use crate::{
    channels::ChannelStore,
    models::{ChannelEvent, ChannelEventKind, DeviceInfo, DeviceType},
};

fn test_device() -> DeviceInfo {
    DeviceInfo {
        id: "device-1".to_string(),
        name: "Murad".to_string(),
        emoji: "M".to_string(),
        ip: "127.0.0.1".to_string(),
        port: 53317,
        device_type: DeviceType::Desktop,
        is_favorite: false,
        last_seen: 1,
    }
}

#[test]
fn channel_metadata_tracks_counts_and_recent_renames() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db = sled::open(temp_dir.path()).unwrap();
    let store = ChannelStore::open(db.open_tree("channels").unwrap());
    let author = test_device();

    let info = store.create_channel("Design Review".to_string(), &author).unwrap();
    let channel = info
        .channels
        .iter()
        .find(|channel| channel.name == "design-review")
        .unwrap();
    let channel_id = channel.id.clone();

    for index in 0..6 {
        store
            .rename_channel(&channel_id, format!("Design Review {index}"), &author)
            .unwrap();
    }

    store
        .save_event(ChannelEvent {
            id: "message-1".to_string(),
            channel_id: channel_id.clone(),
            kind: ChannelEventKind::Text,
            author_id: author.id.clone(),
            author_name: author.name.clone(),
            author_emoji: author.emoji.clone(),
            author_ip: author.ip.clone(),
            text: Some("hello".to_string()),
            asset_id: None,
            file_name: None,
            file_size: None,
            file_path: None,
            available_count: 1,
            created_at: 10,
            updated_at: 10,
            deleted_at: None,
        })
        .unwrap();

    let synced = store.slack_info().unwrap();
    let channel = synced
        .channels
        .iter()
        .find(|channel| channel.id == channel_id)
        .unwrap();
    assert_eq!(channel.name, "design-review-5");
    assert_eq!(channel.message_count, 1);
    assert_eq!(channel.last_name_changes.len(), 5);
}
