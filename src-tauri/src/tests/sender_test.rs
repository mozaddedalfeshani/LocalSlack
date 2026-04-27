use crate::sender::sha256_file;
use std::io::Write;

#[tokio::test]
async fn test_sha256_verification_after_send() {
    let mut file = tempfile::NamedTempFile::new().expect("temp file");
    file.write_all(b"swiftshare").expect("write temp");
    let hash = sha256_file(&file.path().to_path_buf()).await.expect("hash");
    assert_eq!(
        hash,
        "e36f1b45a2856f16059cbb9d9dcc93e81bb62bce033f76f8cf2f629d2060680d"
    );
}
