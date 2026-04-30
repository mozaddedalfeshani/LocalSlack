use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
pub struct NetworkStatus {
    pub device_name: String,
    pub hidden: bool,
    pub hosting: bool,
    pub discovery_running: bool,
    pub advertising: bool,
    pub local_ips: Vec<String>,
    pub port: u16,
    pub service_type: String,
    pub issues: Vec<String>,
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
pub struct PathEntry {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub mime_type: String,
    pub path: String,
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
pub struct TransferStarted {
    pub session_id: String,
    pub peer_name: String,
    pub file_count: usize,
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
pub enum ChannelEventKind {
    Text,
    Asset,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ChannelEvent {
    pub id: String,
    pub channel_id: String,
    pub kind: ChannelEventKind,
    pub author_id: String,
    pub author_name: String,
    #[serde(default)]
    pub author_emoji: String,
    #[serde(default)]
    pub author_ip: String,
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub asset_id: Option<String>,
    #[serde(default)]
    pub file_name: Option<String>,
    #[serde(default)]
    pub file_size: Option<u64>,
    #[serde(default)]
    pub file_path: Option<String>,
    #[serde(default = "default_available_count")]
    pub available_count: u32,
    pub created_at: u64,
    pub updated_at: u64,
    #[serde(default)]
    pub deleted_at: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ChannelNameChange {
    pub previous_name: String,
    pub new_name: String,
    pub changed_by_id: String,
    pub changed_by_name: String,
    pub changed_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SlackChannel {
    pub id: String,
    pub name: String,
    pub title: String,
    pub description: String,
    pub created_by_id: String,
    pub created_by_name: String,
    pub created_at: u64,
    pub updated_at: u64,
    #[serde(default)]
    pub message_count: u64,
    #[serde(default)]
    pub last_name_changes: Vec<ChannelNameChange>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct SlackInfo {
    pub channels: Vec<SlackChannel>,
    pub updated_at: u64,
}

fn default_available_count() -> u32 {
    1
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ChannelEventsResponse {
    pub events: Vec<ChannelEvent>,
    #[serde(default)]
    pub slack_info: SlackInfo,
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
pub struct PrepareUploadRequest {
    pub sender: DeviceInfo,
    pub files: Vec<FileMetadata>,
    #[serde(default)]
    pub channel_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IncomingTransferRequest {
    pub session_id: String,
    pub sender: DeviceInfo,
    pub files: Vec<FileMetadata>,
    #[serde(default)]
    pub channel_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub device_name: String,
    #[serde(default = "default_device_emoji")]
    pub device_emoji: String,
    /// Stable unique ID generated once on first launch
    #[serde(default = "default_device_id")]
    pub device_id: String,
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
    #[serde(default = "default_retention_months")]
    pub retention_months: u32,
}

pub fn default_retention_months() -> u32 {
    5
}

fn default_quick_save_mode() -> String {
    "off".to_string()
}

fn default_device_id() -> String {
    Uuid::new_v4().to_string()
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
