use crate::{
    clipboard,
    channels::ChannelStore,
    direct_messages::DirectMessageStore,
    favorites::FavoritesStore,
    history::HistoryStore,
    models::{
        now_unix, ChannelEvent, ChannelEventKind, ChannelEventsResponse, ClipboardPayload,
        DeviceInfo, DirectMessageEvent, DirectMessageKind, FileMetadata, HistoryEntry,
        IncomingTransferRequest, PrepareUploadRequest, PrepareUploadResponse, TransferDirection,
        TransferProgress, TransferStatus,
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
    collections::{HashMap, HashSet},
    io::ErrorKind,
    net::SocketAddr,
    path::PathBuf,
    sync::Arc,
    time::Instant,
};
use tauri::{AppHandle, Emitter, Manager, UserAttentionType};
use tokio::{fs, io::AsyncWriteExt, sync::RwLock, time};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Clone)]
pub struct ServerState {
    pub app: AppHandle,
    pub device: DeviceInfo,
    pub settings: SettingsStore,
    pub history: HistoryStore,
    pub channels: ChannelStore,
    pub direct_messages: DirectMessageStore,
    pub favorites: FavoritesStore,
    pub sessions: Arc<RwLock<HashMap<String, Vec<FileMetadata>>>>,
    pub sessions_senders: Arc<RwLock<HashMap<String, DeviceInfo>>>,
    pub sessions_channels: Arc<RwLock<HashMap<String, String>>>,
    pub sessions_direct_messages: Arc<RwLock<HashMap<String, Vec<DirectMessageEvent>>>>,
    pub sessions_completed: Arc<RwLock<HashMap<String, HashSet<String>>>>,
    pub pending_incoming: Arc<RwLock<HashMap<String, IncomingTransferRequest>>>,
    pub accepted_sessions: Arc<RwLock<HashMap<String, bool>>>,
}

pub async fn start_server(mut state: ServerState) -> Result<(tokio::task::JoinHandle<()>, u16)> {
    let requested_port = state.settings.get().await.port;
    let (listener, port) = bind_server_port(requested_port).await?;
    if port != requested_port {
        tracing::warn!(
            requested_port,
            port,
            "LocalSlack receiver port was busy; using fallback port"
        );
    }
    state.device.port = port;
    let app = Router::new()
        .route("/api/v1/info", get(info))
        .route("/api/v1/prepare-upload", post(prepare_upload))
        .route("/api/v1/upload/:session_id/:file_id", post(upload))
        .route("/api/v1/clipboard", post(clipboard_endpoint))
        .route("/api/v1/channel/events", get(channel_events).post(save_channel_events))
        .route("/api/v1/channel/assets/:asset_id", get(channel_asset))
        .route("/api/v1/direct/messages", post(save_direct_message))
        .route("/api/v1/cancel/:session_id", delete(cancel))
        .layer(CorsLayer::permissive())
        .with_state(state);
    let handle = tokio::spawn(async move {
        if let Err(error) = axum::serve(listener, app).await {
            tracing::error!(%error, "LocalSlack server stopped");
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
            Err(error) => return Err(error).context("failed to bind LocalSlack server port"),
        }
    }

    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], 0)))
        .await
        .context("failed to bind LocalSlack fallback server port")?;
    let port = listener
        .local_addr()
        .context("failed to read LocalSlack fallback server port")?
        .port();
    Ok((listener, port))
}

async fn info(State(state): State<ServerState>) -> Json<DeviceInfo> {
    Json(state.device)
}

async fn channel_events(State(state): State<ServerState>) -> Json<ChannelEventsResponse> {
    Json(ChannelEventsResponse {
        events: state.channels.events().unwrap_or_default(),
        slack_info: state.channels.slack_info().unwrap_or_default(),
    })
}

async fn save_channel_events(
    State(state): State<ServerState>,
    Json(payload): Json<ChannelEventsResponse>,
) -> impl IntoResponse {
    if let Err(error) = state.channels.save_remote_events(payload.events) {
        return (StatusCode::BAD_REQUEST, error.to_string()).into_response();
    }
    if let Err(error) = state.channels.save_remote_slack_info(payload.slack_info) {
        return (StatusCode::BAD_REQUEST, error.to_string()).into_response();
    }
    StatusCode::ACCEPTED.into_response()
}

async fn channel_asset(
    State(state): State<ServerState>,
    Path(asset_id): Path<String>,
) -> impl IntoResponse {
    let event = state
        .channels
        .events()
        .unwrap_or_default()
        .into_iter()
        .find(|event| event.asset_id.as_deref() == Some(asset_id.as_str()) && event.deleted_at.is_none());
    let Some(event) = event else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let Some(path) = event.file_path else {
        return StatusCode::NOT_FOUND.into_response();
    };
    match fs::read(PathBuf::from(path)).await {
        Ok(bytes) => bytes.into_response(),
        Err(error) => (StatusCode::NOT_FOUND, error.to_string()).into_response(),
    }
}

async fn prepare_upload(
    State(state): State<ServerState>,
    Json(request): Json<PrepareUploadRequest>,
) -> axum::response::Response {
    let sender = request.sender.clone();
    // Enforce IP allow/block lists from settings
    let filter_settings = state.settings.get().await;
    if !filter_settings.allowed_ips.is_empty()
        && !filter_settings.allowed_ips.contains(&sender.ip)
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    if filter_settings.blocked_ips.contains(&sender.ip) {
        return StatusCode::FORBIDDEN.into_response();
    }
    let session_id = Uuid::new_v4().to_string();
    let sender = request.sender;
    let files = request.files;
    let channel_id = request.channel_id;
    let direct_message_events = request.direct_message_events;
    let is_channel_upload = channel_id.is_some();
    let is_direct_message_upload = !direct_message_events.is_empty();
    state
        .sessions
        .write()
        .await
        .insert(session_id.clone(), files.clone());
    // Store sender info so history can record the correct name
    state
        .sessions_senders
        .write()
        .await
        .insert(session_id.clone(), sender.clone());
    if let Some(channel_id) = channel_id.clone() {
        state
            .sessions_channels
            .write()
            .await
            .insert(session_id.clone(), channel_id);
    }
    if is_direct_message_upload {
        state
            .sessions_direct_messages
            .write()
            .await
            .insert(session_id.clone(), direct_message_events);
    }
    let settings = state.settings.get().await;
    let mut accepted = is_channel_upload
        || is_direct_message_upload
        || settings.quick_save
        || settings.quick_save_mode == "on";
    // Favorites mode: auto-accept only if sender is in favorites
    if !accepted && settings.quick_save_mode == "favorites" {
        accepted = state.favorites.is_favorite(&sender.id).unwrap_or(false);
    }
    let incoming = IncomingTransferRequest {
        session_id: session_id.clone(),
        sender: sender.clone(),
        files: files.clone(),
        channel_id,
    };
    if !accepted {
        state
            .pending_incoming
            .write()
            .await
            .insert(session_id.clone(), incoming.clone());
        present_receive_window(&state.app, "incoming-request");
        emit_receive_event(&state.app, "incoming-request", incoming.clone());
        accepted = wait_for_decision(&state, &session_id).await;
        state.pending_incoming.write().await.remove(&session_id);
    }
    if !accepted {
        state.sessions.write().await.remove(&session_id);
        state.sessions_senders.write().await.remove(&session_id);
        state.sessions_channels.write().await.remove(&session_id);
        state.sessions_direct_messages.write().await.remove(&session_id);
    } else if !is_channel_upload && !is_direct_message_upload {
        present_receive_window(&state.app, "receiving-started");
        emit_receive_event(&state.app, "receiving-started", incoming);
    }
    Json(PrepareUploadResponse {
        session_id,
        token: Uuid::new_v4().to_string(),
        accepted,
    })
    .into_response()
}

fn present_receive_window(app: &AppHandle, reason: &str) {
    #[cfg(target_os = "macos")]
    if let Err(error) = app.show() {
        tracing::warn!(%error, %reason, "failed to show LocalSlack app");
    }

    let Some(window) = app.get_webview_window("main") else {
        tracing::warn!(%reason, "LocalSlack main window was not available for receive request");
        return;
    };

    if let Err(error) = window.show() {
        tracing::warn!(%error, %reason, "failed to show LocalSlack main window");
    }
    if let Err(error) = window.unminimize() {
        tracing::warn!(%error, %reason, "failed to unminimize LocalSlack main window");
    }
    if let Err(error) = window.request_user_attention(Some(UserAttentionType::Critical)) {
        tracing::warn!(%error, %reason, "failed to request user attention for receive request");
    }
    if let Err(error) = window.set_focus() {
        tracing::warn!(%error, %reason, "failed to focus LocalSlack main window");
    }
}

fn emit_receive_event(app: &AppHandle, event: &str, payload: IncomingTransferRequest) {
    let result = if let Some(window) = app.get_webview_window("main") {
        window.emit(event, payload)
    } else {
        app.emit(event, payload)
    };

    if let Err(error) = result {
        tracing::warn!(%error, %event, "failed to emit receive event");
    }
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
    let save_dir = channel_save_dir(&settings.save_path, state.sessions_channels.read().await.get(&session_id));
    fs::create_dir_all(&save_dir)
        .await
        .context("failed to create save path")?;
    let output_path = unique_path(save_dir, &file_meta.name).await;
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
        let _ = fs::remove_file(&output_path).await;
        state.app.emit("transfer-failed", session_id)?;
        anyhow::bail!("sha256 verification failed");
    }
    let sender_name = state
        .sessions_senders
        .read()
        .await
        .get(&session_id)
        .map(|s| s.name.clone())
        .unwrap_or_else(|| "Unknown".to_string());
    let entry = HistoryEntry {
        id: Uuid::new_v4().to_string(),
        file_name: file_meta.name.clone(),
        file_size: written,
        direction: TransferDirection::Received,
        device_name: sender_name,
        file_path: output_path.to_string_lossy().to_string(),
        timestamp: now_unix(),
        status: TransferStatus::Completed,
    };
    state.history.save_history_entry(entry)?;
    if let Some(channel_id) = state.sessions_channels.read().await.get(&session_id).cloned() {
        let sender = state
            .sessions_senders
            .read()
            .await
            .get(&session_id)
            .cloned();
        let now = now_unix();
        let event = ChannelEvent {
            id: file_id.clone(),
            channel_id,
            kind: ChannelEventKind::Asset,
            author_id: sender.as_ref().map(|device| device.id.clone()).unwrap_or_default(),
            author_name: sender
                .as_ref()
                .map(|device| device.name.clone())
                .unwrap_or_else(|| "Unknown".to_string()),
            author_emoji: sender.as_ref().map(|device| device.emoji.clone()).unwrap_or_default(),
            author_ip: sender.as_ref().map(|device| device.ip.clone()).unwrap_or_default(),
            text: None,
            asset_id: Some(file_id.clone()),
            file_name: Some(file_meta.name.clone()),
            file_size: Some(written),
            file_path: Some(output_path.to_string_lossy().to_string()),
            available_count: 1,
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };
        state.channels.save_event(event.clone())?;
        state.app.emit("channel-event-updated", event)?;
    }
    if let Some(mut event) = state
        .sessions_direct_messages
        .read()
        .await
        .get(&session_id)
        .and_then(|events| events.iter().find(|event| event.id == file_id).cloned())
    {
        let sender = state
            .sessions_senders
            .read()
            .await
            .get(&session_id)
            .cloned();
        event.peer_id = sender.as_ref().map(|device| device.id.clone()).unwrap_or_default();
        event.recipient_id = state.device.id.clone();
        event.recipient_name = state.device.name.clone();
        event.recipient_emoji = state.device.emoji.clone();
        event.kind = DirectMessageKind::Asset;
        event.file_path = Some(output_path.to_string_lossy().to_string());
        event.file_size = Some(written);
        event.updated_at = now_unix();
        state.direct_messages.save_event(event.clone())?;
        state.app.emit("direct-message-updated", event)?;
    }
    let session_complete = {
        let mut completed_sessions = state.sessions_completed.write().await;
        let completed_files = completed_sessions
            .entry(session_id.clone())
            .or_insert_with(HashSet::new);
        completed_files.insert(file_id.clone());
        let session_complete =
            !files.is_empty() && files.iter().all(|file| completed_files.contains(&file.id));
        if session_complete {
            completed_sessions.remove(&session_id);
        }
        session_complete
    };

    if session_complete {
        state.sessions.write().await.remove(&session_id);
        state.sessions_senders.write().await.remove(&session_id);
        state.sessions_channels.write().await.remove(&session_id);
        state.sessions_direct_messages.write().await.remove(&session_id);
        state.app.emit("transfer-complete", session_id.clone())?;
    }
    if settings.auto_open {
        let _ = open::that(&output_path);
    }
    Ok(())
}

fn channel_save_dir(save_path: &str, channel_id: Option<&String>) -> PathBuf {
    let base = PathBuf::from(save_path);
    let Some(channel_id) = channel_id else {
        return base;
    };
    let safe_channel = channel_id
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '-' || *ch == '_')
        .collect::<String>();
    if safe_channel.is_empty() {
        base
    } else {
        base.join(safe_channel)
    }
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

async fn save_direct_message(
    State(state): State<ServerState>,
    Json(mut event): Json<DirectMessageEvent>,
) -> impl IntoResponse {
    event.peer_id = event.author_id.clone();
    if event.recipient_id.is_empty() {
        event.recipient_id = state.device.id.clone();
        event.recipient_name = state.device.name.clone();
        event.recipient_emoji = state.device.emoji.clone();
    }
    match state.direct_messages.save_remote_event(event.clone()) {
        Ok(()) => {
            let _ = state.app.emit("direct-message-updated", event);
            StatusCode::ACCEPTED.into_response()
        }
        Err(error) => (StatusCode::BAD_REQUEST, error.to_string()).into_response(),
    }
}

async fn cancel(
    State(state): State<ServerState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    state.sessions.write().await.remove(&session_id);
    state.sessions_senders.write().await.remove(&session_id);
    state.sessions_direct_messages.write().await.remove(&session_id);
    state.sessions_completed.write().await.remove(&session_id);
    let _ = state.app.emit("transfer-failed", session_id);
    StatusCode::NO_CONTENT
}
