use crate::{
    direct_messages::DirectMessageStore,
    models::{DirectMessageEvent, DirectMessageKind},
};

fn dm(id: &str, peer_id: &str, created_at: u64) -> DirectMessageEvent {
    DirectMessageEvent {
        id: id.into(),
        peer_id: peer_id.into(),
        kind: DirectMessageKind::Text,
        author_id: "local".into(),
        author_name: "Local".into(),
        author_emoji: "🚀".into(),
        recipient_id: peer_id.into(),
        recipient_name: "Peer".into(),
        recipient_emoji: "⭐".into(),
        text: Some(format!("message {id}")),
        asset_id: None,
        file_name: None,
        file_size: None,
        file_path: None,
        created_at,
        updated_at: created_at,
        deleted_at: None,
    }
}

#[test]
fn direct_messages_store_threads_by_peer_and_sorts() {
    let db = sled::Config::new()
        .temporary(true)
        .open()
        .expect("temporary db");
    let store = DirectMessageStore::open(db.open_tree("direct_messages").expect("dm tree"));
    store.save_event(dm("late", "peer-1", 20)).expect("save late");
    store.save_event(dm("other", "peer-2", 5)).expect("save other");
    store.save_event(dm("early", "peer-1", 10)).expect("save early");

    let thread = store.thread("peer-1").expect("thread");
    assert_eq!(thread.len(), 2);
    assert_eq!(thread[0].id, "early");
    assert_eq!(thread[1].id, "late");
}
