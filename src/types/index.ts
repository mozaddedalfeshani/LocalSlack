export type DeviceType = "desktop" | "mobile" | "web" | "Desktop" | "Mobile" | "Web";

export interface DeviceInfo {
  id: string;
  name: string;
  emoji?: string;
  ip: string;
  port: number;
  deviceType: DeviceType;
  isFavorite: boolean;
  lastSeen: number;
}

export interface NetworkStatus {
  deviceName: string;
  hidden: boolean;
  hosting: boolean;
  discoveryRunning: boolean;
  advertising: boolean;
  localIps: string[];
  port: number;
  serviceType: string;
  issues: string[];
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  sha256: string;
}

export type ChannelId = "general" | "media" | "announcements";

export type ChannelEventKind = "text" | "asset" | "Text" | "Asset";

export interface ChannelEvent {
  id: string;
  channelId: ChannelId;
  kind: ChannelEventKind;
  authorId: string;
  authorName: string;
  authorEmoji?: string;
  authorIp?: string;
  text?: string;
  assetId?: string;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  availableCount: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export type TransferStatus = "pending" | "accepted" | "rejected" | "inProgress" | "completed" | "failed" | "cancelled";
export type TransferDirection = "sent" | "received" | "Sent" | "Received";

export interface TransferProgress {
  sessionId: string;
  fileId: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
}

export interface TransferStarted {
  sessionId: string;
  peerName: string;
  fileCount: number;
}

export interface IncomingTransferRequest {
  sessionId: string;
  sender: DeviceInfo;
  files: FileMetadata[];
  channelId?: ChannelId;
}

export type ReceivingTransfer = IncomingTransferRequest;

export interface OutgoingTransfer {
  target: DeviceInfo;
  files: SelectedFile[];
  sessionId?: string;
}

export interface HistoryEntry {
  id: string;
  fileName: string;
  fileSize: number;
  direction: TransferDirection;
  deviceName: string;
  filePath: string;
  timestamp: number;
  status: TransferStatus;
}

export interface ClipboardPayload {
  text: string;
  sender: DeviceInfo;
  timestamp: number;
}

export interface AppSettings {
  deviceName: string;
  deviceEmoji: string;
  deviceId: string;
  savePath: string;
  quickSave: boolean;
  quickSaveMode: "off" | "favorites" | "on";
  autoOpen: boolean;
  language: string;
  port: number;
  hidden: boolean;
  theme: "dark" | "light" | "system";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  startMinimized: boolean;
  allowedIps: string[];
  blockedIps: string[];
  retentionMonths: number;
}

export interface FileLike {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}

export interface PathEntry {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
}

export interface SelectedFile {
  id: string;
  file: FileLike;
  path: string;
  previewUrl?: string;
}
