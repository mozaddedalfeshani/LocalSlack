import { listen, TauriEvent } from "@tauri-apps/api/event";
import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeviceInfo, SelectedFile } from "../../types";
import { filesFromList, selectedFilesFromPaths } from "../../utils/fileUtils";
import { FilePreview } from "./FilePreview";
import { ImagePreview } from "./ImagePreview";

interface Props {
  files: SelectedFile[];
  selectedDevice?: DeviceInfo;
  error?: string;
  onFiles: (files: SelectedFile[]) => void;
  onPickFiles?: () => void;
  onPickFolder?: () => void;
  onRemove: (id: string) => void;
  onSend: () => void;
}

interface DragDropPayload {
  paths?: string[];
}

export function FileDropZone({ files, selectedDevice, error, onFiles, onPickFiles, onPickFolder, onRemove, onSend }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const canSend = Boolean(selectedDevice && files.length);

  useEffect(() => {
    const unlisteners = [
      listen<DragDropPayload>(TauriEvent.DRAG_ENTER, () => setDragging(true)),
      listen<DragDropPayload>(TauriEvent.DRAG_LEAVE, () => setDragging(false)),
      listen<DragDropPayload>(TauriEvent.DRAG_DROP, async (event) => {
        setDragging(false);
        const paths = event.payload.paths ?? [];
        try {
          const selected = await selectedFilesFromPaths(paths);
          if (selected.length > 0) {
            setLocalError(undefined);
            onFiles(selected);
          }
        } catch (err) {
          setLocalError(String(err));
        }
      })
    ];
    return () => {
      unlisteners.forEach((unlisten) => unlisten.then((fn) => fn()).catch(() => undefined));
    };
  }, [onFiles]);

  const addBrowserFiles = (list: FileList) => {
    const selected = filesFromList(list);
    if (selected.length === 0) {
      setLocalError("Use the File or Folder button, or drag files from the OS, so SwiftShare can read desktop file paths.");
      return;
    }
    setLocalError(undefined);
    onFiles(selected);
  };

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onPickFiles ?? (() => inputRef.current?.click())}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addBrowserFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
          dragging ? "border-[#80d8ca] bg-[#1c3730]" : "border-[#315048] bg-[#10201b] hover:border-[#80d8ca]"
        }`}
      >
        <UploadCloud size={44} strokeWidth={2.8} className="mb-4 text-[#83d8cb]" />
        <span className="text-base font-semibold text-[#e4efeb]">{t("transfer.dropFiles")}</span>
        <span className="mt-1 text-sm text-[#91a39d]">{t("transfer.browseFiles")}</span>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => event.target.files && addBrowserFiles(event.target.files)} />
      </button>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" className="secondary-button" onClick={onPickFiles}>
            File
          </button>
          <button type="button" className="secondary-button" onClick={onPickFolder}>
            Folder
          </button>
        </div>
        <button type="button" className="primary-button" disabled={!canSend} onClick={onSend}>
          {selectedDevice ? "Send" : "Select a device"}
        </button>
      </div>
      {(error || localError) && <p className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{error || localError}</p>}
      <ImagePreview files={files} />
      <FilePreview files={files} onRemove={onRemove} />
    </section>
  );
}
