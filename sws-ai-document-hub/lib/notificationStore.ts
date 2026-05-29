import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export type NotificationType = "SUCCESS" | "ERROR" | "INFO";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
}

const DB_PATH = path.join(process.cwd(), "data", "notifications.json");

// In-process SSE client registry
export const sseClients = new Set<ReadableStreamDefaultController<Uint8Array>>();

export async function readNotifications(): Promise<Notification[]> {
  if (!existsSync(DB_PATH)) return [];
  try {
    const raw = await readFile(DB_PATH, "utf-8");
    const trimmed = raw.replace(/^\uFEFF/, "").trim();
    return trimmed ? JSON.parse(trimmed) : [];
  } catch {
    return [];
  }
}

export async function writeNotifications(notifications: Notification[]) {
  const dir = path.dirname(DB_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(notifications, null, 2));
}

export async function createNotification(
  message: string,
  type: NotificationType
): Promise<Notification> {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    type,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  const existing = await readNotifications();
  await writeNotifications([notification, ...existing]);

  // broadcast to all SSE clients
  broadcastSSE({ type: "new-notification", notification });

  return notification;
}

export function broadcastSSE(payload: object) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  for (const ctrl of sseClients) {
    try { ctrl.enqueue(encoded); } catch { sseClients.delete(ctrl); }
  }
}
