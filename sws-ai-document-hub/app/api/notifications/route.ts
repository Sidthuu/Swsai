import { NextResponse } from "next/server";

// In-memory store for SSE clients and pending bulk jobs
// (persists across requests within the same server process)
const clients = new Set<ReadableStreamDefaultController>();

export interface BulkJob {
  total: number;
  completed: number;
  failed: number;
  finishedAt?: string;
}

const jobs = new Map<string, BulkJob>();

/** Called by the upload route to record progress on a bulk job */
export function recordBulkProgress(jobId: string, total: number, success: boolean) {
  const job = jobs.get(jobId) ?? { total, completed: 0, failed: 0 };
  if (success) job.completed++;
  else job.failed++;
  jobs.set(jobId, job);

  const done = job.completed + job.failed >= job.total;
  if (done) {
    job.finishedAt = new Date().toISOString();
    const payload = JSON.stringify({
      type: "bulk-complete",
      jobId,
      total: job.total,
      completed: job.completed,
      failed: job.failed,
      finishedAt: job.finishedAt,
    });
    for (const ctrl of clients) {
      try { ctrl.enqueue(`data: ${payload}\n\n`); } catch { /* client disconnected */ }
    }
    jobs.delete(jobId);
  }
}

/** SSE subscription endpoint */
export async function GET() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      clients.add(ctrl);
      // keep-alive ping every 20 s
      const ping = setInterval(() => {
        try { ctrl.enqueue(encoder.encode(": ping\n\n")); }
        catch { clearInterval(ping); }
      }, 20_000);
    },
    cancel() {
      clients.delete(controller);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
