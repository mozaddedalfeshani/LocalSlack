use crate::models::AppSettings;
use anyhow::{Context, Result};
use std::{fs, path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct SettingsStore {
    path: PathBuf,
    settings: Arc<RwLock<AppSettings>>,
}

impl SettingsStore {
    pub fn load() -> Result<Self> {
        let dir = app_dir()?;
        fs::create_dir_all(&dir).context("failed to create SwiftShare config directory")?;
        let path = dir.join("settings.json");
        let settings = if path.exists() {
            let bytes = fs::read(&path).context("failed to read settings")?;
            serde_json::from_slice(&bytes).unwrap_or_else(|_| default_settings())
        } else {
            let defaults = default_settings();
            fs::write(&path, serde_json::to_vec_pretty(&defaults)?)
                .context("failed to write default settings")?;
            defaults
        };
        Ok(Self {
            path,
            settings: Arc::new(RwLock::new(settings)),
        })
    }

    pub async fn get(&self) -> AppSettings {
        self.settings.read().await.clone()
    }

    pub async fn save(&self, settings: AppSettings) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).context("failed to create settings parent directory")?;
        }
        fs::write(&self.path, serde_json::to_vec_pretty(&settings)?)
            .context("failed to persist settings")?;
        *self.settings.write().await = settings;
        Ok(())
    }
}

pub fn app_dir() -> Result<PathBuf> {
    let base = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .context("failed to determine local data directory")?;
    Ok(base.join("SwiftShare"))
}

pub fn default_settings() -> AppSettings {
    let save_base = dirs::download_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(std::env::temp_dir);
    AppSettings {
        device_name: hostname(),
        save_path: save_base.join("SwiftShare").to_string_lossy().to_string(),
        quick_save: false,
        auto_open: false,
        language: "en".to_string(),
        port: 53317,
        hidden: false,
        theme: "dark".to_string(),
        accent_color: "indigo".to_string(),
        font_size: "medium".to_string(),
        compact_mode: false,
        start_minimized: false,
        allowed_ips: Vec::new(),
        blocked_ips: Vec::new(),
    }
}

fn hostname() -> String {
    std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "SwiftShare Device".to_string())
}
