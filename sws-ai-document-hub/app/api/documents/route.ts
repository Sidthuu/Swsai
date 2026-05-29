import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET() {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadDir)) return NextResponse.json([]);

  const files = await readdir(uploadDir);
  const docs = await Promise.all(
    files.map(async (filename) => {
      const filePath = path.join(uploadDir, filename);
      const info = await stat(filePath);
      const originalName = filename.replace(/^\d+-/, "").replace(/_/g, " ");
      return {
        name: originalName,
        size: info.size,
        uploadedAt: info.birthtime.toISOString(),
        url: `/uploads/${filename}`,
      };
    })
  );

  return NextResponse.json(docs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
}
