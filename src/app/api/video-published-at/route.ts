import { NextRequest, NextResponse } from "next/server";
import { resolveVideoPublishedAt } from "@/lib/videoEmbed";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ publishedAt: null });
  }

  const publishedAt = await resolveVideoPublishedAt(url);
  return NextResponse.json({ publishedAt });
}
