use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DeviceType {
    Desktop,
    Mobile,
    Web,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    #[serde(default = "default_device_emoji")]
    pub emoji: String,
    pub ip: String,
    pub port: u16,
    pub device_type: DeviceType,
    pub is_favorite: bool,
    pub last_seen: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub mime_type: String,
    pub sha256: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TransferStatus {
    Pending,
    Accepted,
    Rejected,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TransferDirection {
    Sent,
    Received,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TransferProgress {
    pub session_id: String,
    pub file_id: String,
    pub file_name: String,
    pub bytes_transferred: u64,
    pub total_bytes: u64,
    pub speed_bps: f64,
    pub eta_seconds: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TransferSession {
    pub id: String,
    pub files: Vec<FileMetadata>,
    pub sender: DeviceInfo,
    pub status: TransferStatus,
    pub created_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub file_name: String,
    pub file_size: u64,
    pub direction: TransferDirection,
    pub device_name: String,
    pub file_path: String,
    pub timestamp: u64,
    pub status: TransferStatus,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardPayload {
    pub text: String,
    pub sender: DeviceInfo,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub device_name: String,
    #[serde(default = "default_device_emoji")]
    pub device_emoji: String,
    pub save_path: String,
    pub quick_save: bool,
    #[serde(default = "default_quick_save_mode")]
    pub quick_save_mode: String,
    pub auto_open: bool,
    pub language: String,
    pub port: u16,
    pub hidden: bool,
    pub theme: String,
    pub accent_color: String,
    pub font_size: String,
    pub compact_mode: bool,
    pub start_minimized: bool,
    pub allowed_ips: Vec<String>,
    pub blocked_ips: Vec<String>,
}

fn default_quick_save_mode() -> String {
    "off".to_string()
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PrepareUploadResponse {
    pub session_id: String,
    pub token: String,
    pub accepted: bool,
}

pub fn now_unix() -> u64 {
    chrono::Utc::now().timestamp().max(0) as u64
}

pub fn default_device_emoji() -> String {
    "🚀".to_string()
}
