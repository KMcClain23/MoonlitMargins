import { NextRequest, NextResponse } from "next/server";
import { resolveVideoThumbnail } from "@/lib/videoEmbed";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ thumbnailUrl: null });
  }

  const thumbnailUrl = await resolveVideoThumbnail(url);
  return NextResponse.json({ thumbnailUrl });
}
