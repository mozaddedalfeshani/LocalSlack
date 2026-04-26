export type DeviceType = "desktop" | "mobile" | "web" | "Desktop" | "Mobile" | "Web";

export interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  port: number;
  deviceType: DeviceType;
  isFavorite: boolean;
  lastSeen: number;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  sha256: string;
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
  savePath: string;
  quickSave: boolean;
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
}

export interface SelectedFile {
  id: string;
  file: File;
  path?: string;
  previewUrl?: string;
}
