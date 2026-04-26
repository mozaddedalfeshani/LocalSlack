use crate::models::{FileMetadata, PrepareUploadResponse};

#[test]
fn test_prepare_upload_response_shape() {
    let file = FileMetadata {
        id: "file".into(),
        name: "file.txt".into(),
        size: 1,
        mime_type: "text/plain".into(),
        sha256: "hash".into(),
    };
    let response = PrepareUploadResponse {
        session_id: "session".into(),
        token: "token".into(),
        accepted: true,
    };
    assert_eq!(file.name, "file.txt");
    assert!(response.accepted);
}
