import { Info, RotateCcw } from "lucide-react";

export function ReceiveHome({ deviceName }: { deviceName: string }) {
  return (
    <section className="relative flex min-h-full flex-col items-center justify-center text-center">
      <div className="absolute right-0 top-0 flex gap-4">
        <button className="soft-icon-button" type="button" aria-label="Refresh">
          <RotateCcw size={22} strokeWidth={2.8} />
        </button>
        <button className="soft-icon-button" type="button" aria-label="Info">
          <Info size={22} strokeWidth={2.8} />
        </button>
      </div>

      <div className="mb-8 grid h-40 w-40 place-items-center rounded-full">
        <div className="receive-orbit">
          <div className="receive-core" />
        </div>
      </div>
      <h2 className="text-5xl font-light tracking-wide text-[#e6efec]">{deviceName || "SwiftShare Device"}</h2>
      <p className="mt-4 text-2xl font-light text-[#d3dfdc]">Offline</p>

      <div className="mt-24">
        <p className="mb-3 text-sm font-semibold text-[#d9e7e2]">Quick Save</p>
        <div className="inline-grid grid-cols-3 overflow-hidden rounded-full border border-[#9eb9b2] text-sm font-semibold">
          <button className="quick-save-segment" type="button">Off</button>
          <button className="quick-save-segment border-x border-[#9eb9b2]" type="button">Favorites</button>
          <button className="quick-save-segment active" type="button">On</button>
        </div>
      </div>
    </section>
  );
}
