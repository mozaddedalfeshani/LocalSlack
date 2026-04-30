use crate::models::{ClipboardPayload, DeviceInfo};
use anyhow::{Context, Result};
use arboard::Clipboard;
use reqwest::Client;
use tauri::{AppHandle, Emitter};

pub async fn send_clipboard(sender: DeviceInfo, target: DeviceInfo, text: String) -> Result<()> {
    let payload = ClipboardPayload {
        text,
        sender,
        timestamp: crate::models::now_unix(),
    };
    Client::new()
        .post(format!(
            "http://{}:{}/api/v1/clipboard",
            target.ip, target.port
        ))
        .json(&payload)
        .send()
        .await
        .context("failed to send clipboard payload")?
        .error_for_status()
        .context("clipboard endpoint returned an error")?;
    Ok(())
}

pub fn emit_received(app: &AppHandle, payload: ClipboardPayload) -> Result<()> {
    app.emit("clipboard-received", payload)
        .context("failed to emit clipboard-received event")
}

pub fn read_system_clipboard() -> Result<String> {
    let mut clipboard = Clipboard::new().context("failed to access system clipboard")?;
    clipboard
        .get_text()
        .context("failed to read system clipboard")
}

pub fn write_system_clipboard(text: String) -> Result<()> {
    let mut clipboard = Clipboard::new().context("failed to access system clipboard")?;
    clipboard
        .set_text(text)
        .context("failed to write system clipboard")
}
