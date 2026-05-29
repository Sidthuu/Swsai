import { NextRequest, NextResponse } from "next/server";
import { readNotifications, writeNotifications, broadcastSSE } from "@/lib/notificationStore";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notifications = await readNotifications();
  const updated = notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
  await writeNotifications(updated);

  const unreadCount = updated.filter((n) => !n.isRead).length;
  broadcastSSE({ type: "unread-count", count: unreadCount });

  return NextResponse.json({ success: true });
}
