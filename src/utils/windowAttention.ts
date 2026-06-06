import { UserAttentionType, getCurrentWindow } from "@tauri-apps/api/window";
import { useSettingsStore } from "../store/settingsStore";

export function playNotificationSound() {
  const settings = useSettingsStore.getState().settings;
  if (!settings.soundNotifications) return;

  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    // Ding 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Ding 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start();
    osc2.start(ctx.currentTime + 0.08);

    osc1.stop(ctx.currentTime + 0.45);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (error) {
    console.error("Failed to play notification sound", error);
  }
}

export async function showIncomingAttention(title: string, body: string) {
  playNotificationSound();

  try {
    const win = getCurrentWindow();
    await win.show();
    await win.unminimize();
    await win.requestUserAttention(UserAttentionType.Critical);
    await win.setFocus();
  } catch {
    // Window attention is best-effort; the in-app dialog still handles the request.
  }

  const settings = useSettingsStore.getState().settings;
  if (!settings.desktopNotifications) return;

  try {
    if (!("Notification" in window)) return;
    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // Browser notifications are optional in Tauri WebViews.
  }
}

export async function notifyIncomingMessage(title: string, body: string) {
  playNotificationSound();

  const settings = useSettingsStore.getState().settings;
  if (!settings.desktopNotifications) return;

  try {
    if (!("Notification" in window)) return;
    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // Browser notifications are optional in Tauri WebViews.
  }
}
