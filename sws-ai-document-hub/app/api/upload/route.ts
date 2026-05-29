import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { recordBulkProgress } from "@/app/api/notifications/route";
import { createNotification } from "@/lib/notificationStore";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPE = "application/pdf";
const METADATA_PATH = path.join(process.cwd(), "data", "documents.json");

export interface DocMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  url: string;
  uploadedAt: string;
}

// ── Mutex: serialise all read-modify-write on documents.json ─────────────────
let metaLock: Promise<void> = Promise.resolve();

async function withMetaLock<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((res) => { release = res; });
  const current = metaLock;
  metaLock = next;
  await current;          // wait for previous holder to finish
  try {
    return await fn();
  } finally {
    release();            // unblock the next waiter
  }
}
// ─────────────────────────────────────────────────────────────────────────────

async function readMeta(): Promise<DocMeta[]> {
  if (!existsSync(METADATA_PATH)) return [];
  try {
    const raw = await readFile(METADATA_PATH, "utf-8");
    const trimmed = raw.replace(/^\uFEFF/, "").trim();
    return trimmed ? JSON.parse(trimmed) : [];
  } catch {
    return [];
  }
}

async function writeMeta(docs: DocMeta[]) {
  const dir = path.dirname(METADATA_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(METADATA_PATH, JSON.stringify(docs, null, 2));
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const jobId = formData.get("jobId") as string | null;
  const jobTotal = formData.get("jobTotal") ? Number(formData.get("jobTotal")) : null;

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  if (file.type !== ALLOWED_TYPE)
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 422 });

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File exceeds 20 MB limit." }, { status: 422 });

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeName = `${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(path.join(uploadDir, safeName), buffer);

    const meta: DocMeta = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      storagePath: `public/uploads/${safeName}`,
      url: `/uploads/${safeName}`,
      uploadedAt: new Date().toISOString(),
    };

    // Serialised write — safe under concurrent bulk uploads
    await withMetaLock(async () => {
      const existing = await readMeta();
      await writeMeta([meta, ...existing]);
    });

    if (jobId && jobTotal) {
      recordBulkProgress(jobId, jobTotal, true);
    } else {
      await createNotification(`${file.name} uploaded successfully.`, "SUCCESS");
    }

    return NextResponse.json(meta);
  } catch {
    if (jobId && jobTotal) recordBulkProgress(jobId, jobTotal, false);
    await createNotification(`${file.name} upload failed.`, "ERROR");
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
