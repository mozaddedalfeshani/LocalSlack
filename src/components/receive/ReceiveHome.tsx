import { Clock3, Info, ShieldCheck, Zap } from "lucide-react";
import logo from "../../assets/logo.png";

type QuickSaveMode = "off" | "favorites" | "on";

interface Props {
  deviceName: string;
  emoji?: string;
  status: string;
  quickSaveMode: QuickSaveMode;
  onQuickSaveMode: (mode: QuickSaveMode) => void;
  onHistory: () => void;
}

export function ReceiveHome({
  deviceName,
  emoji,
  status,
  quickSaveMode,
  onQuickSaveMode,
  onHistory
}: Props) {
  const quickSaveItems: Array<{ id: QuickSaveMode; label: string; icon: any }> = [
    { id: "off", label: "Off", icon: ShieldCheck },
    { id: "favorites", label: "Favorites", icon: Zap },
    { id: "on", label: "On", icon: Zap }
  ];

  return (
    <section className="flex flex-col gap-8 py-4 animate-in fade-in duration-700 h-full">
      {/* Interactive Radar Reception Area */}
      <div className="relative flex h-full min-h-[600px] w-full flex-col items-center justify-center overflow-hidden transition-all duration-500">
        
        {/* Top Control Bar */}
        <div className="absolute top-8 z-20 flex gap-2 rounded-[22px] border border-border/40 bg-bg-surface/80 p-2 backdrop-blur-md shadow-lg">
          <button 
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-bg-elevated hover:text-accent" 
            onClick={onHistory}
            title="Transfer History"
          >
            <Clock3 size={20} strokeWidth={2.5} />
          </button>
          <button 
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition hover:bg-bg-elevated hover:text-accent"
            title="Device Information"
          >
            <Info size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Radar Background Animations */}
        <div className="absolute inset-0 z-0">
          <div className="absolute left-1/2 top-1/2 h-[1px] w-[1px]">
            <div className="radar-pulse absolute h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20" />
            <div className="radar-pulse absolute h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" style={{ animationDelay: "1s" }} />
            <div className="radar-scan absolute h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </div>
        </div>

        {/* Central Device Identity */}
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="group relative h-40 w-40 transition-transform duration-500 hover:scale-105">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-3xl" />
            {/* The Rotating Orbit is now a subtle background element to the logo */}
            <div className="receive-orbit absolute inset-0 opacity-40" />
            <div className="relative grid h-full w-full place-items-center rounded-full border-2 border-accent/30 bg-bg-surface/50 backdrop-blur-sm shadow-2xl">
              <img src={logo} alt="SwiftShare" className="h-32 w-32 rounded-full object-cover shadow-2xl" />
            </div>
            
            {/* Pulsing Status Indicator */}
            <div className="absolute -bottom-2 -right-2 grid h-12 w-12 place-items-center rounded-2xl border-2 border-accent/50 bg-bg-surface shadow-xl">
              <span className="text-2xl">{emoji || "📡"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tight text-text-primary">
              {deviceName || "SwiftShare Device"}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <p className="text-lg font-medium text-text-muted">{status}</p>
            </div>
          </div>
        </div>
        {/* Modern Quick Save Control (Integrated) */}
        <div className="absolute bottom-8 z-20 w-full max-w-sm px-4">
          <div className="rounded-[30px] border border-border/40 bg-bg-surface/80 p-2 backdrop-blur-md shadow-xl">
            <div className="grid grid-cols-3 gap-1">
              {quickSaveItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onQuickSaveMode(item.id)}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 transition-all duration-300 ${
                    quickSaveMode === item.id
                      ? "bg-accent text-[#241014] shadow-md"
                      : "text-text-muted hover:bg-bg-elevated/50"
                  }`}
                >
                  <item.icon size={14} strokeWidth={2.5} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-text-muted">
        Your device is visible to everyone on the local network.
      </p>
    </section>
  );
}
