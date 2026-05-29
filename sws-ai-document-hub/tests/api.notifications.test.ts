import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const MOCK_NOTIFICATIONS = [
  { id: "n-1", message: "File uploaded.", type: "SUCCESS", timestamp: "2026-01-01T10:00:00.000Z", isRead: false },
  { id: "n-2", message: "Upload failed.", type: "ERROR",   timestamp: "2026-01-01T09:00:00.000Z", isRead: false },
  { id: "n-3", message: "Processing.",   type: "INFO",    timestamp: "2026-01-01T08:00:00.000Z", isRead: true  },
];

vi.mock("@/lib/notificationStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notificationStore")>();
  return {
    ...actual,
    readNotifications: vi.fn().mockResolvedValue(MOCK_NOTIFICATIONS),
    writeNotifications: vi.fn().mockResolvedValue(undefined),
    broadcastSSE: vi.fn(),
    sseClients: new Set(),
  };
});

describe("GET /api/notifications — JSON", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import("@/app/api/notifications/route"));
  });

  it("returns all notifications sorted latest first", async () => {
    const req = new NextRequest("http://localhost/api/notifications", {
      headers: { accept: "application/json" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(3);
    expect(body[0].id).toBe("n-1");
  });
});

describe("PATCH /api/notifications — mark all read", () => {
  let PATCH: () => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    ({ PATCH } = await import("@/app/api/notifications/route"));
  });

  it("marks all notifications as read and returns success", async () => {
    const res = await PATCH();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const { writeNotifications } = await import("@/lib/notificationStore");
    const written = vi.mocked(writeNotifications).mock.calls[0][0];
    expect(written.every((n: { isRead: boolean }) => n.isRead)).toBe(true);
  });
});

describe("GET /api/notifications/unread-count", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import("@/app/api/notifications/unread-count/route"));
  });

  it("returns correct unread count", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    // n-1 and n-2 are unread
    expect(body.count).toBe(2);
  });
});

describe("PATCH /api/notifications/[id]/read", () => {
  let PATCH: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    ({ PATCH } = await import("@/app/api/notifications/[id]/read/route"));
  });

  it("marks a single notification as read", async () => {
    const req = new NextRequest("http://localhost/api/notifications/n-1/read", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "n-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const { writeNotifications } = await import("@/lib/notificationStore");
    const written = vi.mocked(writeNotifications).mock.calls[0][0];
    const updated = written.find((n: { id: string }) => n.id === "n-1");
    expect(updated.isRead).toBe(true);
  });
});
