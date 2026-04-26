import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeviceInfo, SelectedFile } from "../../types";
import { filesFromList } from "../../utils/fileUtils";
import { FilePreview } from "./FilePreview";
import { FolderSelector } from "./FolderSelector";
import { ImagePreview } from "./ImagePreview";

interface Props {
  files: SelectedFile[];
  selectedDevice?: DeviceInfo;
  error?: string;
  onFiles: (files: SelectedFile[]) => void;
  onRemove: (id: string) => void;
  onSend: () => void;
}

export function FileDropZone({ files, selectedDevice, error, onFiles, onRemove, onSend }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const canSend = Boolean(selectedDevice && files.length);
  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFiles(filesFromList(event.dataTransfer.files));
        }}
        className={`flex min-h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
          dragging ? "border-[#80d8ca] bg-[#1c3730]" : "border-[#315048] bg-[#10201b] hover:border-[#80d8ca]"
        }`}
      >
        <UploadCloud size={44} strokeWidth={2.8} className="mb-4 text-[#83d8cb]" />
        <span className="text-base font-semibold text-[#e4efeb]">{t("transfer.dropFiles")}</span>
        <span className="mt-1 text-sm text-[#91a39d]">{t("transfer.browseFiles")}</span>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(event) => event.target.files && onFiles(filesFromList(event.target.files))} />
      </button>
      <div className="flex items-center justify-between gap-3">
        <FolderSelector onFiles={onFiles} />
        <button type="button" className="primary-button" disabled={!canSend} onClick={onSend}>
          {selectedDevice ? t("transfer.send", { device: selectedDevice.name }) : "Select a device"}
        </button>
      </div>
      {error && <p className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</p>}
      <ImagePreview files={files} />
      <FilePreview files={files} onRemove={onRemove} />
    </section>
  );
}
