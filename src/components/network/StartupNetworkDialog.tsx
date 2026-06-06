import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Radio, RefreshCw, Wifi } from "lucide-react";
import type { NetworkStatus } from "../../types";

interface Props {
  open: boolean;
  status?: NetworkStatus;
  loading: boolean;
  error?: string;
  onRefresh: () => void;
  onClose: () => void;
}

export function StartupNetworkDialog({
  open,
  status,
  loading,
  error,
  onRefresh,
  onClose,
}: Props) {
  if (!open) return null;

  const ready = Boolean(
    status &&
      status.hosting &&
      status.discoveryRunning &&
      status.advertising &&
      status.localIps.length > 0
  );

  // Determine current status message
  let statusMessage = "Initializing network services...";
  if (loading) {
    statusMessage = "Verifying connection...";
  } else if (error) {
    statusMessage = "Network verification failed";
  } else if (status) {
    if (!status.hosting) {
      statusMessage = "Starting local server...";
    } else if (!status.discoveryRunning) {
      statusMessage = "Setting up device discovery...";
    } else if (!status.advertising) {
      statusMessage = "Publishing device presence...";
    } else if (status.localIps.length === 0) {
      statusMessage = "Waiting for local IP address...";
    } else if (ready) {
      statusMessage = "Connected and ready!";
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="w-full max-w-[420px] rounded-3xl border border-white/10 bg-bg-surface/80 p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden"
        >
          {/* Subtle top ambient glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

          {/* Animated Logo Container */}
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            {/* Outer breathing rings */}
            <motion.div
              animate={{
                scale: ready ? [1, 1.1, 1] : [1, 1.4, 1],
                opacity: ready ? [0.2, 0.4, 0.2] : [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full bg-accent/10"
            />
            <motion.div
              animate={{
                scale: ready ? [1, 1.05, 1] : [1, 1.25, 1],
                opacity: ready ? [0.3, 0.5, 0.3] : [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="absolute inset-2 rounded-full bg-accent/15"
            />

            {/* Central Icon Base */}
            <motion.div
              animate={ready ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5 }}
              className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr ${
                ready
                  ? "from-success/30 to-success/10 text-success border border-success/30"
                  : error
                    ? "from-error/30 to-error/10 text-error border border-error/30"
                    : "from-accent/30 to-accent/10 text-accent border border-accent/30"
              }`}
            >
              {ready ? (
                <CheckCircle2 size={32} className="stroke-[2.5]" />
              ) : error ? (
                <AlertTriangle size={32} className="stroke-[2.5] animate-bounce" />
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Radio size={32} className="stroke-[2.5]" />
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Title and Badge */}
          <div className="space-y-2 mb-6">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-text-primary via-text-primary to-accent bg-clip-text text-transparent">
              LocalSlack
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              LAN Sharing System
            </p>
          </div>

          {/* Connection Status Text */}
          <div className="space-y-4 mb-8">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-semibold text-text-secondary">
                {statusMessage}
              </span>
              {status?.deviceName && (
                <span className="text-xs text-text-muted">
                  Device: {status.deviceName}
                </span>
              )}
            </div>

            {/* Progress Bar / Spinner */}
            <div className="h-1.5 w-full rounded-full bg-border/20 overflow-hidden relative">
              {ready ? (
                <div className="h-full w-full bg-success transition-all duration-500" />
              ) : error ? (
                <div className="h-full w-full bg-error" />
              ) : (
                <motion.div
                  initial={{ left: "-40%" }}
                  animate={{ left: "100%" }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute top-0 bottom-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent"
                />
              )}
            </div>
          </div>

          {/* Issues warning */}
          {status?.issues && status.issues.length > 0 && (
            <div className="mb-6 rounded-xl border border-warning/20 bg-warning/5 p-3 text-left">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-warning">
                <AlertTriangle size={14} />
                <span>Notice</span>
              </div>
              <ul className="text-[11px] text-text-secondary list-disc pl-4 space-y-1">
                {status.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {error ? (
              <button
                type="button"
                onClick={onRefresh}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-lg shadow-accent/25 hover:shadow-accent/45 transition active:scale-[0.98]"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Retry Connection
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                ready
                  ? "bg-success text-white shadow-lg shadow-success/25 hover:shadow-success/45 active:scale-[0.98]"
                  : "bg-bg-elevated/80 border border-border/40 text-text-secondary hover:bg-bg-elevated"
              }`}
            >
              {ready ? "Get Started" : error ? "Skip & Use Offline" : "Cancel Setup"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
