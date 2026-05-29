import { NextRequest, NextResponse } from "next/server";
import {
  readNotifications,
  writeNotifications,
  sseClients,
  broadcastSSE,
} from "@/lib/notificationStore";

// In-memory bulk job tracker (kept here for upload route to call)
export interface BulkJob {
  total: number;
  completed: number;
  failed: number;
}
const jobs = new Map<string, BulkJob>();

export function recordBulkProgress(jobId: string, total: number, success: boolean) {
  const job = jobs.get(jobId) ?? { total, completed: 0, failed: 0 };
  if (success) job.completed++;
  else job.failed++;
  jobs.set(jobId, job);

  if (job.completed + job.failed >= job.total) {
    const { completed, failed } = job;
    jobs.delete(jobId);
    // fire-and-forget: create bulk summary notification
    import("@/lib/notificationStore").then(({ createNotification }) => {
      const msg = failed === 0
        ? `${completed} files uploaded successfully.`
        : `${completed} files uploaded, ${failed} failed.`;
      const type = failed === 0 ? "SUCCESS" : "ERROR";
      createNotification(msg, type);
    });
  }
}

// GET — return all notifications OR upgrade to SSE stream
export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";

  // SSE subscription
  if (accept.includes("text/event-stream")) {
    let ctrl: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        ctrl = c;
        sseClients.add(ctrl);
        const ping = setInterval(() => {
          try { ctrl.enqueue(encoder.encode(": ping\n\n")); }
          catch { clearInterval(ping); sseClients.delete(ctrl); }
        }, 20_000);
      },
      cancel() { sseClients.delete(ctrl); },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Regular JSON fetch
  const notifications = await readNotifications();
  return NextResponse.json(notifications);
}

// PATCH — mark all as read
export async function PATCH() {
  const notifications = await readNotifications();
  const updated = notifications.map((n) => ({ ...n, isRead: true }));
  await writeNotifications(updated);
  broadcastSSE({ type: "unread-count", count: 0 });
  return NextResponse.json({ success: true });
}
