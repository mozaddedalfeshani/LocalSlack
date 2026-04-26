use crate::models::{ClipboardPayload, DeviceInfo, DeviceType};

#[test]
fn test_clipboard_payload_serializes() {
    let payload = ClipboardPayload {
        text: "hello".into(),
        sender: DeviceInfo {
            id: "id".into(),
            name: "Peer".into(),
            ip: "127.0.0.1".into(),
            port: 53317,
            device_type: DeviceType::Desktop,
            is_favorite: false,
            last_seen: 1,
        },
        timestamp: 1,
    };
    let encoded = serde_json::to_string(&payload).expect("serialize");
    assert!(encoded.contains("hello"));
}
