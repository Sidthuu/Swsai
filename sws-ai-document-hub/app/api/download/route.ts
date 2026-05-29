import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { DocMeta } from "@/app/api/upload/route";
import { readFile as readMetaFile } from "fs/promises";

const METADATA_PATH = path.join(process.cwd(), "data", "documents.json");

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  let docs: DocMeta[] = [];
  if (existsSync(METADATA_PATH)) {
    const raw = await readMetaFile(METADATA_PATH, "utf-8");
    docs = JSON.parse(raw);
  }

  const doc = docs.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(process.cwd(), doc.storagePath);
  if (!existsSync(filePath)) return NextResponse.json({ error: "File missing" }, { status: 404 });

  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.type || "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
