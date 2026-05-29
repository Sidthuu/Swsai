import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(path.join(uploadDir, safeName), buffer);

  return NextResponse.json({
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    url: `/uploads/${safeName}`,
  });
}
