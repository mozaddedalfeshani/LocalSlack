import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DeviceInfo, FileMetadata } from "../../types";

export function ReceiveDialog({ sender, files, onAccept, onReject }: { sender?: DeviceInfo; files: FileMetadata[]; onAccept: () => void; onReject: () => void }) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!sender) return null;
  return (
    <motion.aside initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-5 right-5 w-96 rounded-md border border-border bg-bg-secondary p-4 shadow-panel">
      <h2 className="font-semibold">{sender.name}</h2>
      <p className="text-sm text-text-muted">{files.length} incoming files</p>
      <div className="my-3 max-h-40 overflow-auto text-sm">{files.map((file) => <p key={file.id} className="truncate">{file.name}</p>)}</div>
      <div className="mb-3 h-1 rounded bg-bg-elevated"><div className="h-full rounded bg-warning" style={{ width: `${(seconds / 60) * 100}%` }} /></div>
      <div className="flex justify-end gap-2">
        <button className="secondary-button" onClick={onReject}>{t("transfer.reject")}</button>
        <button className="primary-button" onClick={onAccept}>{t("transfer.accept")}</button>
      </div>
    </motion.aside>
  );
}
