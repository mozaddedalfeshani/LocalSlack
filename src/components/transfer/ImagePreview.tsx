import type { SelectedFile } from "../../types";

export function ImagePreview({ files }: { files: SelectedFile[] }) {
  const images = files.filter((item) => item.previewUrl);
  if (images.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map((item) => (
        <figure key={item.id} className="min-w-0">
          <img
            src={item.previewUrl}
            alt={item.file.name}
            className="aspect-square w-full rounded-md object-cover"
          />
          <figcaption className="mt-1 truncate text-xs text-text-muted">
            {item.file.name}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
