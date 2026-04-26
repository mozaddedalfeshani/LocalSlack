pub mod clipboard;
pub mod crypto;
pub mod discovery;
pub mod favorites;
pub mod history;
pub mod models;
pub mod sender;
pub mod server;
pub mod settings;

use anyhow::Context;
use discovery::DiscoveryState;
use favorites::FavoritesStore;
use history::HistoryStore;
use models::{AppSettings, DeviceInfo, HistoryEntry};
use sender::TransferCanceller;
use settings::SettingsStore;
use std::{collections::HashMap, path::PathBuf, sync::Arc};
use tauri::{Manager, State};
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    settings: SettingsStore,
    discovery: DiscoveryState,
    history: HistoryStore,
    favorites: FavoritesStore,
    canceller: TransferCanceller,
    accepted_sessions: Arc<RwLock<HashMap<String, bool>>>,
}

#[tauri::command]
async fn get_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    Ok(state.discovery.devices(&state.favorites).await)
}

#[tauri::command]
async fn get_device_info(state: State<'_, AppState>) -> Result<DeviceInfo, String> {
    Ok(state.discovery.local_device(&state.settings).await)
}

#[tauri::command]
async fn send_files(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    target: DeviceInfo,
    file_paths: Vec<String>,
) -> Result<(), String> {
    sender::send_files(app, state.canceller.clone(), target, file_paths)
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
        .insert(session_id, true);
    Ok(())
}

#[tauri::command]
async fn reject_transfer(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state
        .accepted_sessions
        .write()
        .await
        .insert(session_id, false);
    Ok(())
}

#[tauri::command]
async fn send_clipboard_text(target: DeviceInfo, text: String) -> Result<(), String> {
    clipboard::send_clipboard(target, text)
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
    state
        .settings
        .save(settings)
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

pub fn run() {
    tracing_subscriber::fmt().with_target(false).init();
    tauri::Builder::default()
        .setup(|app| {
            let settings = SettingsStore::load().context("failed to load settings")?;
            let db_dir = settings::app_dir()?.join("db");
            std::fs::create_dir_all(&db_dir).context("failed to create db directory")?;
            let db = sled::open(db_dir).context("failed to open app database")?;
            let history = HistoryStore::open(db.open_tree("history")?);
            let favorites = FavoritesStore::open(db.open_tree("favorites")?);
            let discovery = DiscoveryState::new();
            let state = AppState {
                settings: settings.clone(),
                discovery: discovery.clone(),
                history: history.clone(),
                favorites: favorites.clone(),
                canceller: TransferCanceller::default(),
                accepted_sessions: Arc::new(RwLock::new(HashMap::new())),
            };
            let app_handle = app.handle().clone();
            let server_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let device = discovery.local_device(&settings).await;
                let _ = discovery
                    .start(app_handle.clone(), settings.clone(), favorites.clone())
                    .await;
                let server_state = server::ServerState {
                    app: server_handle,
                    device,
                    settings,
                    history,
                    sessions: Arc::new(RwLock::new(HashMap::new())),
                };
                if let Err(error) = server::start_server(server_state).await {
                    tracing::error!(%error, "failed to start local server");
                }
            });
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_devices,
            get_device_info,
            send_files,
            cancel_transfer,
            accept_transfer,
            reject_transfer,
            send_clipboard_text,
            read_clipboard,
            write_clipboard,
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
            get_local_ip
        ])
        .run(tauri::generate_context!())
        .expect("failed to run SwiftShare");
}

#[cfg(test)]
mod tests;
