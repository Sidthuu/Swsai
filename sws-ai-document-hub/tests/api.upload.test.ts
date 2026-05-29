import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

// ── helpers ──────────────────────────────────────────────────────────────────
function makePdfFile(name = "test.pdf", sizeBytes = 1024): File {
  const buf = Buffer.alloc(sizeBytes, "%PDF-1.4");
  return new File([buf], name, { type: "application/pdf" });
}

function makeRequest(file: File, extra: Record<string, string> = {}): NextRequest {
  const fd = new FormData();
  fd.append("file", file);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return new NextRequest("http://localhost/api/upload", { method: "POST", body: fd });
}

// ── mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/app/api/notifications/route", () => ({
  recordBulkProgress: vi.fn(),
}));

vi.mock("@/lib/notificationStore", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue("[]"),
  };
});

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(true) };
});

// ── tests ────────────────────────────────────────────────────────────────────
describe("POST /api/upload", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    ({ POST } = await import("@/app/api/upload/route"));
  });

  it("returns 400 when no file is provided", async () => {
    const fd = new FormData();
    const req = new NextRequest("http://localhost/api/upload", { method: "POST", body: fd });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no file/i);
  });

  it("returns 422 for non-PDF file type", async () => {
    const file = new File(["hello"], "doc.txt", { type: "text/plain" });
    const res = await POST(makeRequest(file));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/pdf/i);
  });

  it("returns 422 when file exceeds 20 MB", async () => {
    const oversized = makePdfFile("big.pdf", 21 * 1024 * 1024);
    const res = await POST(makeRequest(oversized));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/20 mb/i);
  });

  it("returns 200 with metadata for a valid PDF", async () => {
    const res = await POST(makeRequest(makePdfFile("valid.pdf")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      name: "valid.pdf",
      type: "application/pdf",
      url: expect.stringContaining("/uploads/"),
      storagePath: expect.stringContaining("public/uploads/"),
    });
    expect(body.id).toBeTruthy();
    expect(body.uploadedAt).toBeTruthy();
  });

  it("calls recordBulkProgress when jobId and jobTotal are provided", async () => {
    const { recordBulkProgress } = await import("@/app/api/notifications/route");
    await POST(makeRequest(makePdfFile(), { jobId: "job-123", jobTotal: "5" }));
    expect(recordBulkProgress).toHaveBeenCalledWith("job-123", 5, true);
  });

  it("calls createNotification for single (non-bulk) upload", async () => {
    const { createNotification } = await import("@/lib/notificationStore");
    await POST(makeRequest(makePdfFile("single.pdf")));
    expect(createNotification).toHaveBeenCalledWith(
      expect.stringContaining("single.pdf"),
      "SUCCESS"
    );
  });

  it("sanitises filename — special chars replaced with underscores", async () => {
    const file = makePdfFile("my file (1).pdf");
    const res = await POST(makeRequest(file));
    const body = await res.json();
    expect(body.url).not.toMatch(/[ ()]/);
  });
});
