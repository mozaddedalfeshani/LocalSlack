import type { SelectedFile } from "../types";

export function filesFromList(list: FileList | File[]): SelectedFile[] {
  return Array.from(list).map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    path: (file as File & { path?: string }).path,
    previewUrl: isImage(file) ? URL.createObjectURL(file) : undefined
  }));
}

export function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isMedia(file: File): boolean {
  return /^(image|video|audio)\//.test(file.type) || /\.(svg|webp|mp4|mp3)$/i.test(file.name);
}

export function fileIconType(file: File): "image" | "video" | "audio" | "archive" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (/\.(zip|tar|gz|rar|7z)$/i.test(file.name)) return "archive";
  return "file";
}
