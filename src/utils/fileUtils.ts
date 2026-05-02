import { invoke } from "@tauri-apps/api/core";
import type { FileLike, PathEntry, SelectedFile } from "../types";

export function filesFromList(list: FileList | File[]): SelectedFile[] {
  return Array.from(list).flatMap((file) => {
    const path = (file as File & { path?: string }).path;
    if (!path) return [];
    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file: toFileLike(file),
      path,
      previewUrl: isImage(file) ? URL.createObjectURL(file) : undefined,
    };
  });
}

export function selectedFilesFromEntries(entries: PathEntry[]): SelectedFile[] {
  return entries.map((entry) => ({
    id: entry.id,
    file: {
      name: entry.name,
      size: entry.size,
      type: entry.mimeType,
    },
    path: entry.path,
  }));
}

export async function selectedFilesFromPaths(
  paths: string[],
): Promise<SelectedFile[]> {
  if (paths.length === 0) return [];
  const entries = await invoke<PathEntry[]>("get_path_entries", { paths });
  return selectedFilesFromEntries(entries);
}

export async function pickDesktopFiles(
  kind: "files" | "folder",
): Promise<SelectedFile[]> {
  const paths = await invoke<string[]>("pick_paths", { kind });
  return selectedFilesFromPaths(paths);
}

function toFileLike(file: File): FileLike {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

export function isImage(file: FileLike): boolean {
  return file.type.startsWith("image/");
}

export function isMedia(file: FileLike): boolean {
  return (
    /^(image|video|audio)\//.test(file.type) ||
    /\.(svg|webp|mp4|mp3)$/i.test(file.name)
  );
}

export function fileIconType(
  file: FileLike,
): "image" | "video" | "audio" | "archive" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (/\.(zip|tar|gz|rar|7z)$/i.test(file.name)) return "archive";
  return "file";
}
