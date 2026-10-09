import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/storage/upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeFilename(filename: string | null): string {
  const safe = (filename || "download")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]/g, "_")
    .trim();

  return safe || "download";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing file key" }, { status: 400 });
  }

  try {
    const buffer = await getFile(key);
    const contentType = searchParams.get("type") || "application/octet-stream";
    const filename = sanitizeFilename(searchParams.get("name"));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("File fetch error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
