import { CheckCircle2, FolderDown, Info, Radio, RotateCcw, ShieldCheck, Wifi } from "lucide-react";

export function ReceiveHome({ deviceName, emoji }: { deviceName: string; emoji?: string }) {
  return (
    <section className="mx-auto grid min-h-full max-w-7xl grid-cols-[minmax(0,1fr)_360px] gap-6 py-6">
      <div className="office-panel relative flex min-h-[640px] flex-col items-center justify-center overflow-hidden p-8 text-center">
        <div className="absolute right-5 top-5 flex gap-3">
          <button className="soft-icon-button" type="button" aria-label="Refresh">
            <RotateCcw size={22} strokeWidth={2.8} />
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
        <p className="mb-3 rounded-full bg-[#173028] px-4 py-1 text-sm font-bold text-[#83d8cb]">Ready for office transfers</p>
        <h2 className="text-5xl font-light tracking-wide text-[#e6efec]">{deviceName || "SwiftShare Device"}</h2>
        <p className="mt-4 text-2xl font-light text-[#d3dfdc]">Visible on local network</p>

        <div className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-3">
          <div className="receive-stat">
            <Wifi size={24} />
            <span>LAN only</span>
          </div>
          <div className="receive-stat">
            <ShieldCheck size={24} />
            <span>Encrypted</span>
          </div>
          <div className="receive-stat">
            <FolderDown size={24} />
            <span>Quick save</span>
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <section className="office-panel p-5">
          <h3 className="text-lg font-bold text-[#effaf7]">Receiving mode</h3>
          <p className="mt-1 text-sm text-[#8fa59f]">Control how incoming files are handled at your desk.</p>
          <div className="mt-5">
            <p className="mb-3 text-sm font-semibold text-[#d9e7e2]">Quick Save</p>
            <div className="grid grid-cols-3 overflow-hidden rounded-full border border-[#9eb9b2] text-sm font-semibold">
              <button className="quick-save-segment" type="button">Off</button>
              <button className="quick-save-segment border-x border-[#9eb9b2]" type="button">Favorites</button>
              <button className="quick-save-segment active" type="button">On</button>
            </div>
          </div>
        </section>

        <section className="office-panel p-5">
          <h3 className="text-lg font-bold text-[#effaf7]">Today</h3>
          <div className="mt-4 space-y-3">
            <div className="receive-metric">
              <CheckCircle2 size={20} />
              <span>0 files received</span>
            </div>
            <div className="receive-metric">
              <Radio size={20} />
              <span>Waiting for nearby devices</span>
            </div>
          </div>
        </section>

        <section className="office-panel p-5">
          <h3 className="text-lg font-bold text-[#effaf7]">Office tip</h3>
          <p className="mt-2 text-sm leading-6 text-[#8fa59f]">Keep SwiftShare open during meetings so teammates can send files to your desk without email or cloud uploads.</p>
        </section>
      </aside>
    </section>
  );
}
