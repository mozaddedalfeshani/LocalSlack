use crate::sender::sha256_file;
use std::io::Write;

#[tokio::test]
async fn test_sha256_verification_after_send() {
    let mut file = tempfile::NamedTempFile::new().expect("temp file");
    file.write_all(b"localslack").expect("write temp");
    let hash = sha256_file(&file.path().to_path_buf()).await.expect("hash");
    assert_eq!(
        hash,
        "318a2ed3481ca1a22ce0d0e6734b42bd8db22cc840d46a0e6d0f308812d39696"
    );
}
