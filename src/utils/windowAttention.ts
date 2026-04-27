import { UserAttentionType, getCurrentWindow } from "@tauri-apps/api/window";

export async function showIncomingAttention(title: string, body: string) {
  try {
    const win = getCurrentWindow();
    await win.show();
    await win.unminimize();
    await win.requestUserAttention(UserAttentionType.Critical);
    await win.setFocus();
  } catch {
    // Window attention is best-effort; the in-app dialog still handles the request.
  }

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
