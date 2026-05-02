import { Copy, X } from "lucide-react";
import { useClipboard } from "../../hooks/useClipboard";

export function ClipboardReceive() {
  const clipboard = useClipboard();
  if (!clipboard.received) return null;
  return (
    <aside className="fixed bottom-5 right-5 w-96 rounded-md border border-border bg-bg-secondary p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Text received</h2>
        <button
          className="icon-button"
          onClick={clipboard.clearReceived}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      <p className="max-h-52 overflow-auto whitespace-pre-wrap rounded bg-bg-surface p-3 text-sm">
        {clipboard.received.text}
      </p>
      <button
        className="primary-button mt-3 w-full"
        onClick={() => clipboard.write(clipboard.received?.text ?? "")}
      >
        <Copy size={16} /> Copy to Clipboard
      </button>
    </aside>
  );
}
