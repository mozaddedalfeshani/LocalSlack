use crate::settings::app_dir;
use anyhow::{Context, Result};
use rcgen::generate_simple_self_signed;
use std::fs;

pub fn load_or_generate_cert() -> Result<(String, String)> {
    let dir = app_dir()?.join("certs");
    fs::create_dir_all(&dir).context("failed to create cert directory")?;
    let cert_path = dir.join("swiftshare-cert.pem");
    let key_path = dir.join("swiftshare-key.pem");
    if cert_path.exists() && key_path.exists() {
        let cert = fs::read_to_string(cert_path).context("failed to read TLS certificate")?;
        let key = fs::read_to_string(key_path).context("failed to read TLS key")?;
        return Ok((cert, key));
    }
    let cert = generate_simple_self_signed(vec![
        "swiftshare.local".to_string(),
        "localhost".to_string(),
    ])
    .context("failed to generate self-signed certificate")?;
    let cert_pem = cert.cert.pem();
    let key_pem = cert.key_pair.serialize_pem();
    fs::write(&cert_path, cert_pem.as_bytes()).context("failed to write TLS certificate")?;
    fs::write(&key_path, key_pem.as_bytes()).context("failed to write TLS key")?;
    Ok((cert_pem, key_pem))
}
