pub mod clipboard;
pub mod channels;
pub mod discovery;
pub mod favorites;
pub mod history;
pub mod models;
pub mod sender;
pub mod server;
pub mod settings;

use anyhow::Context;
use channels::ChannelStore;
use discovery::DiscoveryState;
use favorites::FavoritesStore;
use history::HistoryStore;
use models::{
    AppSettings, ChannelEvent, ChannelEventKind, ChannelEventsResponse, DeviceInfo, HistoryEntry,
    IncomingTransferRequest, NetworkStatus, PathEntry,
};
use sender::TransferCanceller;
use settings::SettingsStore;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::Command,
    sync::Arc,
};
use tauri::{Manager, State};
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    settings: SettingsStore,
    discovery: DiscoveryState,
    history: HistoryStore,
    channels: ChannelStore,
    favorites: FavoritesStore,
    canceller: TransferCanceller,
    accepted_sessions: Arc<RwLock<HashMap<String, bool>>>,
    pending_incoming: Arc<RwLock<HashMap<String, IncomingTransferRequest>>>,
}

#[tauri::command]
async fn get_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    Ok(state.discovery.devices(&state.favorites).await)
}

#[tauri::command]
async fn scan_network_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    Ok(state
        .discovery
        .scan_local_subnets(&state.settings, &state.favorites)
        .await)
}

#[tauri::command]
async fn set_receive_mode_active(state: State<'_, AppState>, active: bool) -> Result<(), String> {
    state
        .discovery
        .set_receive_visible(&state.settings, active)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_device_info(state: State<'_, AppState>) -> Result<DeviceInfo, String> {
    Ok(state.discovery.local_device(&state.settings).await)
}

#[tauri::command]
async fn get_pending_incoming(
    state: State<'_, AppState>,
) -> Result<Vec<IncomingTransferRequest>, String> {
    Ok(state
        .pending_incoming
        .read()
        .await
        .values()
        .cloned()
        .collect())
}

#[tauri::command]
async fn send_files(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    target: DeviceInfo,
    file_paths: Vec<String>,
    channel_id: Option<String>,
    asset_ids: Option<Vec<String>>,
) -> Result<(), String> {
    let sender = state.discovery.local_device(&state.settings).await;
    sender::send_files(
        app,
        state.canceller.clone(),
        sender,
        target,
        file_paths,
        channel_id,
        asset_ids,
    )
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn cancel_transfer(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.canceller.cancel(&session_id).await;
    Ok(())
}

#[tauri::command]
async fn accept_transfer(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state
        .accepted_sessions
        .write()
        .await
        .insert(session_id.clone(), true);
    state.pending_incoming.write().await.remove(&session_id);
    Ok(())
}

#[tauri::command]
async fn reject_transfer(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state
        .accepted_sessions
        .write()
        .await
        .insert(session_id.clone(), false);
    state.pending_incoming.write().await.remove(&session_id);
    Ok(())
}

#[tauri::command]
async fn send_clipboard_text(
    state: State<'_, AppState>,
    target: DeviceInfo,
    text: String,
) -> Result<(), String> {
    let sender = state.discovery.local_device(&state.settings).await;
    clipboard::send_clipboard(sender, target, text)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn read_clipboard() -> Result<String, String> {
    clipboard::read_system_clipboard().map_err(|error| error.to_string())
}

#[tauri::command]
async fn write_clipboard(text: String) -> Result<(), String> {
    clipboard::write_system_clipboard(text).map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_channel_events(state: State<'_, AppState>) -> Result<Vec<ChannelEvent>, String> {
    state.channels.events().map_err(|error| error.to_string())
}

#[tauri::command]
async fn save_channel_text_event(
    state: State<'_, AppState>,
    channel_id: String,
    text: String,
) -> Result<ChannelEvent, String> {
    let author = state.discovery.local_device(&state.settings).await;
    let now = models::now_unix();
    let event = ChannelEvent {
        id: Uuid::new_v4().to_string(),
        channel_id,
        kind: ChannelEventKind::Text,
        author_id: author.id,
        author_name: author.name,
        author_emoji: author.emoji,
        author_ip: author.ip,
        text: Some(text),
        asset_id: None,
        file_name: None,
        file_size: None,
        file_path: None,
        available_count: 1,
        created_at: now,
        updated_at: now,
        deleted_at: None,
    };
    state
        .channels
        .save_event(event.clone())
        .map_err(|error| error.to_string())?;
    Ok(event)
}

#[tauri::command]
async fn save_channel_asset_event(
    state: State<'_, AppState>,
    channel_id: String,
    file_name: String,
    file_size: u64,
    file_path: String,
    recipient_count: u32,
) -> Result<ChannelEvent, String> {
    let author = state.discovery.local_device(&state.settings).await;
    let now = models::now_unix();
    let asset_id = Uuid::new_v4().to_string();
    let event = ChannelEvent {
        id: asset_id.clone(),
        channel_id,
        kind: ChannelEventKind::Asset,
        author_id: author.id,
        author_name: author.name,
        author_emoji: author.emoji,
        author_ip: author.ip,
        text: None,
        asset_id: Some(asset_id),
        file_name: Some(file_name),
        file_size: Some(file_size),
        file_path: Some(file_path),
        available_count: recipient_count.saturating_add(1),
        created_at: now,
        updated_at: now,
        deleted_at: None,
    };
    state
        .channels
        .save_event(event.clone())
        .map_err(|error| error.to_string())?;
    Ok(event)
}

#[tauri::command]
async fn delete_channel_event(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<ChannelEvent>, String> {
    let author = state.discovery.local_device(&state.settings).await;
    state
        .channels
        .mark_deleted(&id, &author.id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn edit_channel_text_event(
    state: State<'_, AppState>,
    id: String,
    text: String,
) -> Result<Option<ChannelEvent>, String> {
    let author = state.discovery.local_device(&state.settings).await;
    state
        .channels
        .edit_text(&id, &author.id, text)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn sync_channels(state: State<'_, AppState>) -> Result<Vec<ChannelEvent>, String> {
    let devices = state.discovery.devices(&state.favorites).await;
    let client = reqwest::Client::new();
    let local_events = state
        .channels
        .events()
        .map_err(|error| error.to_string())?;
    for device in devices {
        let url = format!("http://{}:{}/api/v1/channel/events", device.ip, device.port);
        if let Ok(response) = client.get(&url).send().await {
            if let Ok(response) = response.error_for_status() {
                if let Ok(remote) = response.json::<ChannelEventsResponse>().await {
                    let _ = state.channels.save_remote_events(remote.events);
                }
            }
        }
        let current_events = state
            .channels
            .events()
            .map_err(|error| error.to_string())?;
        let _ = client
            .post(&url)
            .json(&ChannelEventsResponse {
                events: current_events,
            })
            .send()
            .await;
    }
    state
        .channels
        .save_events(local_events)
        .map_err(|error| error.to_string())?;
    state.channels.events().map_err(|error| error.to_string())
}

#[tauri::command]
async fn download_channel_asset(
    state: State<'_, AppState>,
    event_id: String,
) -> Result<ChannelEvent, String> {
    let mut event = state
        .channels
        .event(&event_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "channel asset was not found".to_string())?;
    let asset_id = event
        .asset_id
        .clone()
        .unwrap_or_else(|| event.id.clone());
    let file_name = event
        .file_name
        .clone()
        .unwrap_or_else(|| "LocalSlack asset".to_string());
    let devices = state.discovery.devices(&state.favorites).await;
    let client = reqwest::Client::new();

    for device in devices {
        let url = format!(
            "http://{}:{}/api/v1/channel/assets/{}",
            device.ip, device.port, asset_id
        );
        let Ok(response) = client.get(url).send().await else {
            continue;
        };
        let Ok(response) = response.error_for_status() else {
            continue;
        };
        let Ok(bytes) = response.bytes().await else {
            continue;
        };

        let settings = state.settings.get().await;
        let save_dir = channel_save_dir(&settings.save_path, &event.channel_id);
        std::fs::create_dir_all(&save_dir).map_err(|error| error.to_string())?;
        let output_path = unique_local_path(save_dir, &file_name);
        std::fs::write(&output_path, bytes).map_err(|error| error.to_string())?;
        event.file_path = Some(output_path.to_string_lossy().to_string());
        event.available_count = event.available_count.max(1);
        event.updated_at = models::now_unix();
        state
            .channels
            .save_event(event.clone())
            .map_err(|error| error.to_string())?;
        return Ok(event);
    }

    Err("no online member has this asset right now".to_string())
}

#[tauri::command]
async fn add_favorite(state: State<'_, AppState>, device: DeviceInfo) -> Result<(), String> {
    state
        .favorites
        .add_favorite(device)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn remove_favorite(state: State<'_, AppState>, device_id: String) -> Result<(), String> {
    state
        .favorites
        .remove_favorite(&device_id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_favorites(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    state
        .favorites
        .get_favorites()
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_history(
    state: State<'_, AppState>,
    filter: String,
) -> Result<Vec<HistoryEntry>, String> {
    state
        .history
        .get_history(&filter)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state
        .history
        .clear_history()
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn delete_history_entry(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .history
        .delete_entry(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    Ok(state.settings.get().await)
}

#[tauri::command]
async fn save_settings(state: State<'_, AppState>, settings: AppSettings) -> Result<(), String> {
    let retention_months = settings.retention_months;
    state
        .settings
        .save(settings)
        .await
        .map_err(|error| error.to_string())?;
    state
        .channels
        .cleanup_expired(retention_months)
        .map_err(|error| error.to_string())?;
    state
        .discovery
        .apply_receive_visibility(&state.settings)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn open_file(path: String) -> Result<(), String> {
    open::that(PathBuf::from(path)).map_err(|error| error.to_string())
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    let target = if path.is_file() {
        path.parent().map(PathBuf::from).unwrap_or(path)
    } else {
        path
    };
    open::that(target).map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_local_ip() -> Result<Vec<String>, String> {
    Ok(discovery::local_ips())
}

#[tauri::command]
async fn get_network_status(state: State<'_, AppState>) -> Result<NetworkStatus, String> {
    Ok(state.discovery.network_status(&state.settings).await)
}

#[tauri::command]
async fn get_path_entries(paths: Vec<String>) -> Result<Vec<PathEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || path_entries(paths))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn pick_paths(kind: String) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || pick_paths_blocking(&kind))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())
}

fn path_entries(paths: Vec<String>) -> anyhow::Result<Vec<PathEntry>> {
    let mut files = Vec::new();
    for path in paths {
        collect_files(PathBuf::from(path), &mut files)?;
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}

fn collect_files(path: PathBuf, files: &mut Vec<PathEntry>) -> anyhow::Result<()> {
    if path.is_file() {
        let metadata = std::fs::metadata(&path)?;
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("file")
            .to_string();
        files.push(PathEntry {
            id: Uuid::new_v4().to_string(),
            name,
            size: metadata.len(),
            mime_type: mime_guess::from_path(&path)
                .first_or_octet_stream()
                .essence_str()
                .to_string(),
            path: path.to_string_lossy().to_string(),
        });
    } else if path.is_dir() {
        for entry in std::fs::read_dir(path)? {
            collect_files(entry?.path(), files)?;
        }
    }
    Ok(())
}

fn pick_paths_blocking(kind: &str) -> anyhow::Result<Vec<String>> {
    #[cfg(target_os = "macos")]
    return pick_paths_macos(kind);

    #[cfg(target_os = "linux")]
    return pick_paths_linux(kind);

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    anyhow::bail!("native file picker is not available on this platform")
}

#[cfg(target_os = "macos")]
fn pick_paths_macos(kind: &str) -> anyhow::Result<Vec<String>> {
    let target = if kind == "folder" { "folder" } else { "file" };
    let script = format!(
        r#"set chosenItems to choose {target} with multiple selections allowed
set output to ""
repeat with itemRef in chosenItems
  set output to output & POSIX path of itemRef & linefeed
end repeat
return output"#
    );
    run_picker_command(Command::new("osascript").arg("-e").arg(script))
}

#[cfg(target_os = "linux")]
fn pick_paths_linux(kind: &str) -> anyhow::Result<Vec<String>> {
    let mut zenity = Command::new("zenity");
    zenity
        .arg("--file-selection")
        .arg("--multiple")
        .arg("--separator=\n");
    if kind == "folder" {
        zenity.arg("--directory");
    }
    match run_picker_command(&mut zenity) {
        Ok(paths) => Ok(paths),
        Err(_) => {
            let mut kdialog = Command::new("kdialog");
            if kind == "folder" {
                kdialog.arg("--getexistingdirectory").arg(".");
            } else {
                kdialog
                    .arg("--multiple")
                    .arg("--separate-output")
                    .arg("--getopenfilename")
                    .arg(".");
            }
            run_picker_command(&mut kdialog)
        }
    }
}

fn run_picker_command(command: &mut Command) -> anyhow::Result<Vec<String>> {
    let output = command.output()?;
    if !output.status.success() {
        return Ok(Vec::new());
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|path| !path.is_empty())
        .filter(|path| Path::new(path).exists())
        .map(ToString::to_string)
        .collect())
}

fn channel_save_dir(save_path: &str, channel_id: &str) -> PathBuf {
    let safe_channel = channel_id
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '-' || *ch == '_')
        .collect::<String>();
    if safe_channel.is_empty() {
        PathBuf::from(save_path)
    } else {
        PathBuf::from(save_path).join(safe_channel)
    }
}

fn unique_local_path(dir: PathBuf, file_name: &str) -> PathBuf {
    let base = dir.join(file_name);
    if !base.exists() {
        return base;
    }
    let path = Path::new(file_name);
    let stem = path.file_stem().and_then(|value| value.to_str()).unwrap_or("file");
    let ext = path.extension().and_then(|value| value.to_str()).unwrap_or("");
    for index in 1..1000 {
        let candidate_name = if ext.is_empty() {
            format!("{stem} ({index})")
        } else {
            format!("{stem} ({index}).{ext}")
        };
        let candidate = dir.join(candidate_name);
        if !candidate.exists() {
            return candidate;
        }
    }
    dir.join(format!("{}-{}", Uuid::new_v4(), file_name))
}

pub fn run() {
    tracing_subscriber::fmt().with_target(false).init();
    tauri::Builder::default()
        .setup(|app| {
            let settings = SettingsStore::load().context("failed to load settings")?;
            let db_dir = settings::app_dir()?.join("db");
            std::fs::create_dir_all(&db_dir).context("failed to create db directory")?;
            let db = sled::open(db_dir).context("failed to open app database")?;
            let history = HistoryStore::open(db.open_tree("history")?);
            let channels = ChannelStore::open(db.open_tree("channels")?);
            let favorites = FavoritesStore::open(db.open_tree("favorites")?);
            let discovery = DiscoveryState::new(settings.device_id.clone());
            let accepted_sessions = Arc::new(RwLock::new(HashMap::new()));
            let pending_incoming = Arc::new(RwLock::new(HashMap::new()));
            let state = AppState {
                settings: settings.clone(),
                discovery: discovery.clone(),
                history: history.clone(),
                channels: channels.clone(),
                favorites: favorites.clone(),
                canceller: TransferCanceller::default(),
                accepted_sessions: accepted_sessions.clone(),
                pending_incoming: pending_incoming.clone(),
            };
            let app_handle = app.handle().clone();
            let server_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let device = discovery.local_device(&settings).await;
                let server_state = server::ServerState {
                    app: server_handle,
                    device,
                    settings: settings.clone(),
                    history,
                    channels: channels.clone(),
                    favorites: favorites.clone(),
                    sessions: Arc::new(RwLock::new(HashMap::new())),
                    sessions_senders: Arc::new(RwLock::new(HashMap::new())),
                    sessions_channels: Arc::new(RwLock::new(HashMap::new())),
                    sessions_completed: Arc::new(RwLock::new(HashMap::new())),
                    pending_incoming,
                    accepted_sessions,
                };
                match server::start_server(server_state).await {
                    Ok((_handle, port)) => {
                        discovery.set_runtime_port(port).await;
                        if let Err(error) =
                            discovery.start(app_handle.clone(), favorites.clone()).await
                        {
                            tracing::error!(%error, "failed to start discovery");
                        }
                        // Always advertise on the network after server starts;
                        // settings.hidden controls actual visibility
                        if let Err(error) = discovery.set_receive_visible(&settings, true).await {
                            tracing::error!(%error, "failed to start mDNS advertisement");
                        }
                    }
                    Err(error) => {
                        tracing::error!(%error, "failed to start local server");
                    }
                }
            });
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_devices,
            scan_network_devices,
            set_receive_mode_active,
            get_device_info,
            get_pending_incoming,
            send_files,
            cancel_transfer,
            accept_transfer,
            reject_transfer,
            send_clipboard_text,
            read_clipboard,
            write_clipboard,
            get_channel_events,
            save_channel_text_event,
            save_channel_asset_event,
            delete_channel_event,
            edit_channel_text_event,
            sync_channels,
            download_channel_asset,
            add_favorite,
            remove_favorite,
            get_favorites,
            get_history,
            clear_history,
            delete_history_entry,
            get_settings,
            save_settings,
            open_file,
            open_folder,
            get_local_ip,
            get_network_status,
            get_path_entries,
            pick_paths
        ])
        .run(tauri::generate_context!())
        .expect("failed to run LocalSlack");
}

#[cfg(test)]
mod tests;
