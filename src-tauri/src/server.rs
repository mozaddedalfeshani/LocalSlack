use crate::{
    clipboard,
    history::HistoryStore,
    models::{
        now_unix, ClipboardPayload, DeviceInfo, FileMetadata, HistoryEntry, PrepareUploadRequest,
        PrepareUploadResponse, TransferDirection, TransferProgress, TransferStatus,
    },
    settings::SettingsStore,
};
use anyhow::{Context, Result};
use axum::{
    body::Body,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap, io::ErrorKind, net::SocketAddr, path::PathBuf, sync::Arc, time::Instant,
};
use tauri::{AppHandle, Emitter};
use tokio::{fs, io::AsyncWriteExt, sync::RwLock, time};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Clone)]
pub struct ServerState {
    pub app: AppHandle,
    pub device: DeviceInfo,
    pub settings: SettingsStore,
    pub history: HistoryStore,
    pub sessions: Arc<RwLock<HashMap<String, Vec<FileMetadata>>>>,
    pub accepted_sessions: Arc<RwLock<HashMap<String, bool>>>,
}

pub async fn start_server(mut state: ServerState) -> Result<(tokio::task::JoinHandle<()>, u16)> {
    let requested_port = state.settings.get().await.port;
    let (listener, port) = bind_server_port(requested_port).await?;
    if port != requested_port {
        tracing::warn!(
            requested_port,
            port,
            "SwiftShare receiver port was busy; using fallback port"
        );
    }
    state.device.port = port;
    let app = Router::new()
        .route("/api/v1/info", get(info))
        .route("/api/v1/prepare-upload", post(prepare_upload))
        .route("/api/v1/upload/:session_id/:file_id", post(upload))
        .route("/api/v1/clipboard", post(clipboard_endpoint))
        .route("/api/v1/cancel/:session_id", delete(cancel))
        .layer(CorsLayer::permissive())
        .with_state(state);
    let handle = tokio::spawn(async move {
        if let Err(error) = axum::serve(listener, app).await {
            tracing::error!(%error, "SwiftShare server stopped");
        }
    });
    Ok((handle, port))
}

async fn bind_server_port(requested_port: u16) -> Result<(tokio::net::TcpListener, u16)> {
    for offset in 0..50_u16 {
        let Some(port) = requested_port.checked_add(offset) else {
            break;
        };
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        match tokio::net::TcpListener::bind(addr).await {
            Ok(listener) => return Ok((listener, port)),
            Err(error) if error.kind() == ErrorKind::AddrInUse => continue,
            Err(error) => return Err(error).context("failed to bind SwiftShare server port"),
        }
    }

    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], 0)))
        .await
        .context("failed to bind SwiftShare fallback server port")?;
    let port = listener
        .local_addr()
        .context("failed to read SwiftShare fallback server port")?
        .port();
    Ok((listener, port))
}

async fn info(State(state): State<ServerState>) -> Json<DeviceInfo> {
    Json(state.device)
}

async fn prepare_upload(
    State(state): State<ServerState>,
    Json(request): Json<PrepareUploadRequest>,
) -> impl IntoResponse {
    let session_id = Uuid::new_v4().to_string();
    let sender = request.sender;
    let files = request.files;
    state
        .sessions
        .write()
        .await
        .insert(session_id.clone(), files.clone());
    let settings = state.settings.get().await;
    let mut accepted = settings.quick_save || settings.quick_save_mode == "on";
    if !accepted {
        let _ = state.app.emit(
            "incoming-request",
            IncomingTransferRequest {
                session_id: session_id.clone(),
                sender: sender.clone(),
                files: files.clone(),
            },
        );
        accepted = wait_for_decision(&state, &session_id).await;
    }
    if !accepted {
        state.sessions.write().await.remove(&session_id);
    } else {
        let _ = state.app.emit(
            "receiving-started",
            IncomingTransferRequest {
                session_id: session_id.clone(),
                sender,
                files,
            },
        );
    }
    Json(PrepareUploadResponse {
        session_id,
        token: Uuid::new_v4().to_string(),
        accepted,
    })
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct IncomingTransferRequest {
    session_id: String,
    sender: DeviceInfo,
    files: Vec<FileMetadata>,
}

async fn wait_for_decision(state: &ServerState, session_id: &str) -> bool {
    let deadline = time::Instant::now() + time::Duration::from_secs(60);
    loop {
        if let Some(accepted) = state.accepted_sessions.write().await.remove(session_id) {
            return accepted;
        }
        if time::Instant::now() >= deadline {
            return false;
        }
        time::sleep(time::Duration::from_millis(150)).await;
    }
}

async fn upload(
    State(state): State<ServerState>,
    Path((session_id, file_id)): Path<(String, String)>,
    body: Body,
) -> impl IntoResponse {
    match save_upload(state, session_id, file_id, body).await {
        Ok(()) => StatusCode::CREATED.into_response(),
        Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response(),
    }
}

async fn save_upload(
    state: ServerState,
    session_id: String,
    file_id: String,
    body: Body,
) -> Result<()> {
    let files = state
        .sessions
        .read()
        .await
        .get(&session_id)
        .cloned()
        .unwrap_or_default();
    let file_meta = files
        .iter()
        .find(|file| file.id == file_id)
        .cloned()
        .unwrap_or(FileMetadata {
            id: file_id.clone(),
            name: file_id.clone(),
            size: 0,
            mime_type: "application/octet-stream".to_string(),
            sha256: String::new(),
        });
    let settings = state.settings.get().await;
    fs::create_dir_all(&settings.save_path)
        .await
        .context("failed to create save path")?;
    let output_path = unique_path(PathBuf::from(&settings.save_path), &file_meta.name).await;
    let mut output = fs::File::create(&output_path)
        .await
        .context("failed to create output file")?;
    let mut stream = body.into_data_stream();
    let started = Instant::now();
    let mut written = 0_u64;
    let mut hasher = Sha256::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("failed to read upload chunk")?;
        output
            .write_all(&chunk)
            .await
            .context("failed to write upload chunk")?;
        hasher.update(&chunk);
        written += chunk.len() as u64;
        let elapsed = started.elapsed().as_secs_f64().max(0.001);
        let speed = written as f64 / elapsed;
        state.app.emit(
            "transfer-progress",
            TransferProgress {
                session_id: session_id.clone(),
                file_id: file_id.clone(),
                file_name: file_meta.name.clone(),
                bytes_transferred: written,
                total_bytes: file_meta.size.max(written),
                speed_bps: speed,
                eta_seconds: if speed > 0.0 {
                    file_meta.size.saturating_sub(written) as f64 / speed
                } else {
                    0.0
                },
            },
        )?;
    }
    output.flush().await.context("failed to flush upload")?;
    let computed = format!("{:x}", hasher.finalize());
    if !file_meta.sha256.is_empty() && computed != file_meta.sha256 {
        state.app.emit("transfer-failed", session_id)?;
        anyhow::bail!("sha256 verification failed");
    }
    let entry = HistoryEntry {
        id: Uuid::new_v4().to_string(),
        file_name: file_meta.name.clone(),
        file_size: written,
        direction: TransferDirection::Received,
        device_name: state.device.name.clone(),
        file_path: output_path.to_string_lossy().to_string(),
        timestamp: now_unix(),
        status: TransferStatus::Completed,
    };
    state.history.save_history_entry(entry)?;
    state
        .app
        .emit("transfer-complete", file_meta.name.clone())?;
    if settings.auto_open {
        let _ = open::that(&output_path);
    }
    Ok(())
}

async fn unique_path(dir: PathBuf, file_name: &str) -> PathBuf {
    let base = dir.join(file_name);
    if fs::metadata(&base).await.is_err() {
        return base;
    }
    let stem = base.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
    let ext = base.extension().and_then(|s| s.to_str()).unwrap_or("");
    for index in 1..10_000 {
        let candidate = if ext.is_empty() {
            dir.join(format!("{stem} ({index})"))
        } else {
            dir.join(format!("{stem} ({index}).{ext}"))
        };
        if fs::metadata(&candidate).await.is_err() {
            return candidate;
        }
    }
    dir.join(format!("{}-{}", Uuid::new_v4(), file_name))
}

async fn clipboard_endpoint(
    State(state): State<ServerState>,
    Json(payload): Json<ClipboardPayload>,
) -> impl IntoResponse {
    match clipboard::emit_received(&state.app, payload) {
        Ok(()) => StatusCode::OK.into_response(),
        Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response(),
    }
}

async fn cancel(
    State(state): State<ServerState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    state.sessions.write().await.remove(&session_id);
    let _ = state.app.emit("transfer-failed", session_id);
    StatusCode::NO_CONTENT
}
