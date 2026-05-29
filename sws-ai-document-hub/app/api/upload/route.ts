import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { recordBulkProgress } from "@/app/api/notifications/route";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const jobId = formData.get("jobId") as string | null;
  const jobTotal = formData.get("jobTotal") ? Number(formData.get("jobTotal")) : null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(path.join(uploadDir, safeName), buffer);

    if (jobId && jobTotal) recordBulkProgress(jobId, jobTotal, true);

    return NextResponse.json({
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      url: `/uploads/${safeName}`,
    });
  } catch {
    if (jobId && jobTotal) recordBulkProgress(jobId, jobTotal, false);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
