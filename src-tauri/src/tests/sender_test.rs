use crate::sender::sha256_file;
use std::io::Write;

#[tokio::test]
async fn test_sha256_verification_after_send() {
    let mut file = tempfile::NamedTempFile::new().expect("temp file");
    file.write_all(b"swiftshare").expect("write temp");
    let hash = sha256_file(&file.path().to_path_buf()).await.expect("hash");
    assert_eq!(
        hash,
        "ad44dab545aa90fcfa744987fd73b0843154fda759a4265324912bf7bc98e3b8"
    );
}
