import { ClipboardPaste, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClipboard } from "../../hooks/useClipboard";
import type { DeviceInfo } from "../../types";

export function ClipboardSend({ selectedDevice }: { selectedDevice?: DeviceInfo }) {
  const { t } = useTranslation();
  const clipboard = useClipboard();
  const [text, setText] = useState("");
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        document.getElementById("clipboard-textarea")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <section className="space-y-4">
      <div className="relative">
        <textarea
          id="clipboard-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("clipboard.placeholder")}
          className="min-h-72 w-full resize-y rounded-md border border-border bg-bg-secondary p-4 text-text-primary outline-none focus:border-accent"
        />
        <span className="absolute bottom-3 right-3 text-xs text-text-muted">{text.length}</span>
      </div>
      <div className="flex justify-between gap-3">
        <button type="button" className="secondary-button" onClick={async () => setText(await clipboard.read())}>
          <ClipboardPaste size={16} /> {t("clipboard.paste")}
        </button>
        <button type="button" className="primary-button" disabled={!selectedDevice || !text.trim()} onClick={() => selectedDevice && clipboard.send(selectedDevice, text)}>
          <Send size={16} /> {t("clipboard.send")}
        </button>
      </div>
      {clipboard.error && <p className="text-sm text-error">{clipboard.error}</p>}
    </section>
  );
}
