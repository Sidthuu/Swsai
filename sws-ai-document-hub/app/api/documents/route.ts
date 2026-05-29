import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { DocMeta } from "@/app/api/upload/route";

const METADATA_PATH = path.join(process.cwd(), "data", "documents.json");

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
  await writeFile(METADATA_PATH, JSON.stringify(docs, null, 2));
}

export async function GET() {
  const docs = await readMeta();
  return NextResponse.json(docs);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  const docs = await readMeta();
  const doc = docs.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(process.cwd(), doc.storagePath);
  if (existsSync(filePath)) await unlink(filePath);

  await writeMeta(docs.filter((d) => d.id !== id));
  return NextResponse.json({ success: true });
}
