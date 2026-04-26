use crate::models::{
    now_unix, DeviceInfo, FileMetadata, HistoryEntry, TransferDirection, TransferProgress,
    TransferStatus,
};
use anyhow::{anyhow, Context, Result};
use futures_util::StreamExt;
use reqwest::{Body, Client};
use sha2::{Digest, Sha256};
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Instant,
};
use tauri::{AppHandle, Emitter};
use tokio::{fs::File, io::AsyncReadExt};
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct TransferCanceller {
    flags: Arc<tokio::sync::RwLock<std::collections::HashMap<String, Arc<AtomicBool>>>>,
}

impl TransferCanceller {
    pub async fn create(&self, id: &str) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        self.flags
            .write()
            .await
            .insert(id.to_string(), flag.clone());
        flag
    }

    pub async fn cancel(&self, id: &str) {
        if let Some(flag) = self.flags.read().await.get(id) {
            flag.store(true, Ordering::SeqCst);
        }
    }
}

pub async fn build_metadata(path: &PathBuf) -> Result<FileMetadata> {
    let meta = tokio::fs::metadata(path)
        .await
        .context("failed to stat file")?;
    if !meta.is_file() {
        return Err(anyhow!("{} is not a file", path.display()));
    }
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file")
        .to_string();
    Ok(FileMetadata {
        id: Uuid::new_v4().to_string(),
        name,
        size: meta.len(),
        mime_type: mime_guess::from_path(path)
            .first_or_octet_stream()
            .to_string(),
        sha256: sha256_file(path).await?,
    })
}

pub async fn send_files(
    app: AppHandle,
    canceller: TransferCanceller,
    target: DeviceInfo,
    paths: Vec<String>,
) -> Result<()> {
    let file_paths: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    let mut files = Vec::new();
    for path in &file_paths {
        files.push(build_metadata(path).await?);
    }
    let session_id = Uuid::new_v4().to_string();
    let cancel_flag = canceller.create(&session_id).await;
    Client::new()
        .post(format!(
            "http://{}:{}/api/v1/prepare-upload",
            target.ip, target.port
        ))
        .json(&files)
        .send()
        .await
        .context("target device is offline or unreachable")?
        .error_for_status()
        .context("target rejected upload preparation")?;

    for (path, file) in file_paths.iter().zip(files.iter()) {
        if cancel_flag.load(Ordering::SeqCst) {
            return Err(anyhow!("transfer cancelled"));
        }
        stream_one_file(
            &app,
            &target,
            &session_id,
            path.clone(),
            file.clone(),
            cancel_flag.clone(),
        )
        .await?;
        let entry = HistoryEntry {
            id: Uuid::new_v4().to_string(),
            file_name: file.name.clone(),
            file_size: file.size,
            direction: TransferDirection::Sent,
            device_name: target.name.clone(),
            file_path: path.to_string_lossy().to_string(),
            timestamp: now_unix(),
            status: TransferStatus::Completed,
        };
        let _ = app.emit("history-entry", entry);
    }
    app.emit("transfer-complete", session_id)?;
    Ok(())
}

async fn stream_one_file(
    app: &AppHandle,
    target: &DeviceInfo,
    session_id: &str,
    path: PathBuf,
    file_meta: FileMetadata,
    cancel_flag: Arc<AtomicBool>,
) -> Result<()> {
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Vec<u8>, std::io::Error>>(8);
    let emit_app = app.clone();
    let emit_session = session_id.to_string();
    let emit_file = file_meta.clone();
    tokio::spawn(async move {
        let started = Instant::now();
        let mut sent = 0_u64;
        match File::open(&path).await {
            Ok(mut file) => loop {
                if cancel_flag.load(Ordering::SeqCst) {
                    break;
                }
                let mut buffer = vec![0_u8; 64 * 1024];
                match file.read(&mut buffer).await {
                    Ok(0) => break,
                    Ok(n) => {
                        buffer.truncate(n);
                        sent += n as u64;
                        let elapsed = started.elapsed().as_secs_f64().max(0.001);
                        let speed = sent as f64 / elapsed;
                        let remaining = emit_file.size.saturating_sub(sent) as f64;
                        let progress = TransferProgress {
                            session_id: emit_session.clone(),
                            file_id: emit_file.id.clone(),
                            file_name: emit_file.name.clone(),
                            bytes_transferred: sent,
                            total_bytes: emit_file.size,
                            speed_bps: speed,
                            eta_seconds: if speed > 0.0 { remaining / speed } else { 0.0 },
                        };
                        let _ = emit_app.emit("transfer-progress", progress);
                        if tx.send(Ok(buffer)).await.is_err() {
                            break;
                        }
                    }
                    Err(error) => {
                        let _ = tx.send(Err(error)).await;
                        break;
                    }
                }
            },
            Err(error) => {
                let _ = tx.send(Err(error)).await;
            }
        }
    });
    let stream = async_stream::try_stream! {
        let mut rx = rx;
        while let Some(chunk) = rx.recv().await {
            yield chunk?;
        }
    };
    let request_stream = stream.map(|r: Result<Vec<u8>, std::io::Error>| r.map(bytes::Bytes::from));
    Client::new()
        .post(format!(
            "http://{}:{}/api/v1/upload/{}/{}",
            target.ip, target.port, session_id, file_meta.id
        ))
        .body(Body::wrap_stream(request_stream))
        .send()
        .await
        .context("failed to upload file")?
        .error_for_status()
        .context("upload endpoint returned an error")?;
    Ok(())
}

pub async fn sha256_file(path: &PathBuf) -> Result<String> {
    let mut file = File::open(path)
        .await
        .context("failed to open file for hashing")?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; 64 * 1024];
    loop {
        let read = file
            .read(&mut buffer)
            .await
            .context("failed to read file for hashing")?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}
