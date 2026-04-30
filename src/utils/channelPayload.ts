import type { ChannelId } from "../data/channels";
import type { DeviceInfo } from "../types";

const PREFIX = "SWIFTSHARE_CHANNEL_MESSAGE:";

export interface ChannelTextPayload {
  channelId: ChannelId;
  text: string;
  sender?: Pick<DeviceInfo, "id" | "name" | "emoji">;
  timestamp: number;
}

export function encodeChannelText(payload: ChannelTextPayload): string {
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function decodeChannelText(text: string): ChannelTextPayload | undefined {
  if (!text.startsWith(PREFIX)) return undefined;

  try {
    const parsed = JSON.parse(text.slice(PREFIX.length)) as Partial<ChannelTextPayload>;
    if (!parsed.channelId || typeof parsed.text !== "string" || typeof parsed.timestamp !== "number") {
      return undefined;
    }
    return parsed as ChannelTextPayload;
  } catch {
    return undefined;
  }
}
