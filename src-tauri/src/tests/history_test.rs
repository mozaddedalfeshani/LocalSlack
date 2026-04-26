use crate::{
    history::HistoryStore,
    models::{HistoryEntry, TransferDirection, TransferStatus},
};

fn entry(id: &str, direction: TransferDirection) -> HistoryEntry {
    HistoryEntry {
        id: id.into(),
        file_name: format!("{id}.txt"),
        file_size: 10,
        direction,
        device_name: "Peer".into(),
        file_path: "/tmp/file".into(),
        timestamp: 1,
        status: TransferStatus::Completed,
    }
}

#[test]
fn test_history_crud_and_filters() {
    let db = sled::Config::new()
        .temporary(true)
        .open()
        .expect("temporary db");
    let store = HistoryStore::open(db);
    store
        .save_history_entry(entry("sent", TransferDirection::Sent))
        .expect("save sent");
    store
        .save_history_entry(entry("received", TransferDirection::Received))
        .expect("save received");
    assert_eq!(store.get_history("all").expect("all").len(), 2);
    assert_eq!(store.get_history("sent").expect("sent").len(), 1);
    assert_eq!(store.get_history("received").expect("received").len(), 1);
    store.delete_entry("sent").expect("delete");
    assert_eq!(store.get_history("all").expect("all").len(), 1);
    store.clear_history().expect("clear");
    assert_eq!(store.get_history("all").expect("all").len(), 0);
}
