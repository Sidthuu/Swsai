import { NextResponse } from "next/server";
import { readNotifications } from "@/lib/notificationStore";

export async function GET() {
  const notifications = await readNotifications();
  const count = notifications.filter((n) => !n.isRead).length;
  return NextResponse.json({ count });
}
