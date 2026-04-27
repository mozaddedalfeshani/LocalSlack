import { motion } from "framer-motion";
import { CheckCircle2, Monitor, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeviceInfo, FileMetadata } from "../../types";

export function ReceiveDialog({ sender, files, onAccept, onReject }: { sender?: DeviceInfo; files: FileMetadata[]; onAccept: () => void; onReject: () => void }) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    setSeconds(60);
  }, [sender?.id]);
  useEffect(() => {
    if (!sender) return undefined;
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [sender]);
  useEffect(() => {
    if (sender && seconds === 0) onReject();
  }, [onReject, seconds, sender]);
  if (!sender) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg-primary/80 px-4 backdrop-blur-sm">
      <motion.aside
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-md border border-border bg-bg-secondary p-6 text-center shadow-panel"
      >
        <Monitor className="mx-auto mb-4 h-12 w-12 text-text-primary" aria-hidden="true" />
        <h2 className="break-words text-3xl font-semibold text-text-primary">{sender.name}</h2>
        <p className="mt-3 text-base text-text-secondary">wants to send you {files.length === 1 ? "a file" : "files"}</p>
        <div className="my-5 max-h-40 overflow-auto rounded-md bg-bg-surface p-3 text-left text-sm text-text-secondary">
          {files.map((file) => (
            <p key={file.id} className="truncate">{file.name}</p>
          ))}
        </div>
        <div className="mb-5 h-1 rounded bg-bg-elevated">
          <div className="h-full rounded bg-warning" style={{ width: `${(seconds / 60) * 100}%` }} />
        </div>
        <div className="flex justify-center gap-3">
          <button className="secondary-button bg-error/20 text-text-primary hover:border-error" onClick={onReject}>
            <X size={18} />
            {t("transfer.reject")}
          </button>
          <button className="primary-button bg-success text-[#10251d] hover:bg-success/90" onClick={onAccept}>
            <CheckCircle2 size={18} />
            {t("transfer.accept")}
          </button>
        </div>
      </motion.aside>
    </div>
  );
}
