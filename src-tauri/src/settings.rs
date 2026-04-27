use crate::models::AppSettings;
use anyhow::{Context, Result};
use std::{fs, path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct SettingsStore {
    path: PathBuf,
    settings: Arc<RwLock<AppSettings>>,
    /// Cached device_id for sync access at startup
    pub device_id: String,
}

impl SettingsStore {
    pub fn load() -> Result<Self> {
        let dir = app_dir()?;
        fs::create_dir_all(&dir).context("failed to create SwiftShare config directory")?;
        let path = dir.join("settings.json");
        let mut settings = if path.exists() {
            let bytes = fs::read(&path).context("failed to read settings")?;
            serde_json::from_slice(&bytes).unwrap_or_else(|_| default_settings())
        } else {
            let defaults = default_settings();
            fs::write(&path, serde_json::to_vec_pretty(&defaults)?)
                .context("failed to write default settings")?;
            defaults
        };
        if is_generated_cute_name(&settings.device_name) {
            settings.device_name = hostname();
            fs::write(&path, serde_json::to_vec_pretty(&settings)?)
                .context("failed to write migrated settings")?;
        }
        Ok(Self {
            device_id: settings.device_id.clone(),
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
        device_emoji: generate_device_emoji(),
        device_id: uuid::Uuid::new_v4().to_string(),
        save_path: save_base.join("SwiftShare").to_string_lossy().to_string(),
        quick_save: false,
        quick_save_mode: "off".to_string(),
        auto_open: false,
        language: "en".to_string(),
        port: 53317,
        hidden: false,
        theme: "dark".to_string(),
        accent_color: "coral".to_string(),
        font_size: "medium".to_string(),
        compact_mode: false,
        start_minimized: false,
        allowed_ips: Vec::new(),
        blocked_ips: Vec::new(),
    }
}

fn hostname() -> String {
    // On macOS, $HOSTNAME is not set in GUI app environments — use scutil instead
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("scutil")
            .args(["--get", "ComputerName"])
            .output()
        {
            let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !name.is_empty() {
                return name;
            }
        }
    }
    // On Linux, $HOSTNAME may not be set in GUI sessions — read /etc/hostname
    #[cfg(target_os = "linux")]
    {
        if let Ok(name) = std::fs::read_to_string("/etc/hostname") {
            let trimmed = name.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }
    let name = std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "SwiftShare Device".to_string());
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "SwiftShare Device".to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn generate_cute_name() -> String {
    let seed = hostname().bytes().fold(0usize, |acc, byte| {
        acc.wrapping_mul(31).wrapping_add(byte as usize)
    });
    let adjective = CUTE_ADJECTIVES[seed % CUTE_ADJECTIVES.len()];
    let noun = CUTE_NOUNS[(seed / CUTE_ADJECTIVES.len()).max(1) % CUTE_NOUNS.len()];
    format!("{adjective} {noun}")
}

const CUTE_ADJECTIVES: &[&str] = &[
    "Bright", "Calm", "Clever", "Cozy", "Fast", "Gentle", "Happy", "Kind", "Lucky", "Mighty",
    "Neat", "Quiet", "Rapid", "Shiny", "Sunny", "Swift",
];

const CUTE_NOUNS: &[&str] = &[
    "Apple", "Berry", "Cloud", "Comet", "Daisy", "Falcon", "Mango", "Moon", "Nova", "Pear",
    "Pixel", "River", "Rocket", "Star", "Stone", "Wave",
];

fn is_generated_cute_name(name: &str) -> bool {
    let Some((adjective, noun)) = name.split_once(' ') else {
        return false;
    };
    CUTE_ADJECTIVES.contains(&adjective) && CUTE_NOUNS.contains(&noun)
}

pub fn generate_device_emoji() -> String {
    const EMOJIS: &[&str] = &[
        "🌙", "⭐", "🚀", "🍐", "🍋", "🍉", "🫐", "🌿", "🔥", "💎", "🎧", "📡", "🧭", "⚡", "🪄",
        "🌊",
    ];
    let seed = hostname().bytes().fold(0usize, |acc, byte| {
        acc.wrapping_mul(31).wrapping_add(byte as usize)
    });
    EMOJIS[seed % EMOJIS.len()].to_string()
}
