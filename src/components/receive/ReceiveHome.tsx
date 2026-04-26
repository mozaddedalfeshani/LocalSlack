import { Clock3, Info } from "lucide-react";

type QuickSaveMode = "off" | "favorites" | "on";

export function ReceiveHome({
  deviceName,
  emoji,
  quickSaveMode,
  onQuickSaveMode,
  onHistory
}: {
  deviceName: string;
  emoji?: string;
  quickSaveMode: QuickSaveMode;
  onQuickSaveMode: (mode: QuickSaveMode) => void;
  onHistory: () => void;
}) {
  const quickSaveItems: Array<{ id: QuickSaveMode; label: string }> = [
    { id: "off", label: "Off" },
    { id: "favorites", label: "Favorites" },
    { id: "on", label: "On" }
  ];

  return (
    <section className="relative flex min-h-full flex-col items-center justify-center text-center">
      <div className="absolute right-0 top-0 flex gap-4">
        <button className="soft-icon-button" type="button" aria-label="History" onClick={onHistory}>
          <Clock3 size={22} strokeWidth={2.8} />
        </button>
        <button className="soft-icon-button" type="button" aria-label="Info">
          <Info size={22} strokeWidth={2.8} />
        </button>
      </div>

      <div className="mb-8 grid h-44 w-44 place-items-center rounded-full">
        <div className="receive-orbit">
          <div className="receive-core">{emoji || "🚀"}</div>
        </div>
      </div>
      <h2 className="text-5xl font-light text-text-primary">{deviceName || "SwiftShare Device"}</h2>
      <p className="mt-4 text-2xl font-light text-text-secondary">Offline</p>

      <div className="mt-24">
        <p className="mb-3 text-sm font-medium text-text-secondary">Quick Save</p>
        <div className="inline-grid grid-cols-3 overflow-hidden rounded-full border border-border text-sm font-medium">
          {quickSaveItems.map((item, index) => (
            <button
              key={item.id}
              className={`quick-save-segment ${quickSaveMode === item.id ? "active" : ""} ${index === 1 ? "border-x border-border" : ""}`}
              type="button"
              onClick={() => onQuickSaveMode(item.id)}
              aria-pressed={quickSaveMode === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
