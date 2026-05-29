import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const MOCK_DOCS = [
  {
    id: "doc-1",
    name: "file1.pdf",
    size: 1024,
    type: "application/pdf",
    storagePath: "public/uploads/doc-1-file1.pdf",
    url: "/uploads/doc-1-file1.pdf",
    uploadedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: "doc-2",
    name: "file2.pdf",
    size: 2048,
    type: "application/pdf",
    storagePath: "public/uploads/doc-2-file2.pdf",
    url: "/uploads/doc-2-file2.pdf",
    uploadedAt: "2026-01-01T11:00:00.000Z",
  },
];

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn().mockResolvedValue(JSON.stringify(MOCK_DOCS)),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(true) };
});

describe("GET /api/documents", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import("@/app/api/documents/route"));
  });

  it("returns all documents as JSON array", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("doc-1");
  });

  it("returns empty array when no documents exist", async () => {
    const { readFile } = await import("fs/promises");
    vi.mocked(readFile).mockResolvedValueOnce("[]");
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("DELETE /api/documents", () => {
  let DELETE: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    ({ DELETE } = await import("@/app/api/documents/route"));
  });

  it("returns 400 when id is missing", async () => {
    const req = new NextRequest("http://localhost/api/documents", {
      method: "DELETE",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when document id does not exist", async () => {
    const req = new NextRequest("http://localhost/api/documents", {
      method: "DELETE",
      body: JSON.stringify({ id: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it("deletes document and returns success", async () => {
    const req = new NextRequest("http://localhost/api/documents", {
      method: "DELETE",
      body: JSON.stringify({ id: "doc-1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const { writeFile } = await import("fs/promises");
    const written = JSON.parse(vi.mocked(writeFile).mock.calls[0][1] as string);
    expect(written.find((d: { id: string }) => d.id === "doc-1")).toBeUndefined();
  });
});
