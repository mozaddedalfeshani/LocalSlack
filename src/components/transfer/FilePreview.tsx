import { File, Image, Music, Package, Video, X } from "lucide-react";
import type { SelectedFile } from "../../types";
import { fileIconType } from "../../utils/fileUtils";
import { formatBytes } from "../../utils/formatUtils";

const icons = {
  image: Image,
  video: Video,
  audio: Music,
  archive: Package,
  file: File,
};

export function FilePreview({
  files,
  onRemove,
}: {
  files: SelectedFile[];
  onRemove: (id: string) => void;
}) {
  if (files.length === 0)
    return <p className="text-sm text-text-muted">No files selected.</p>;
  return (
    <div className="space-y-2">
      {files.map((item) => {
        const Icon = icons[fileIconType(item.file)];
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md border border-border bg-bg-surface p-2"
          >
            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <Icon className="text-accent" size={22} />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.file.name}</p>
              <p className="text-xs text-text-muted">
                {formatBytes(item.file.size)}
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.file.name}`}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
