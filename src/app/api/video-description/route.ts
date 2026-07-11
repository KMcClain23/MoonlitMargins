import { NextRequest, NextResponse } from "next/server";
import { resolveVideoDescription } from "@/lib/videoEmbed";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ description: null });
  }

  const description = await resolveVideoDescription(url);
  return NextResponse.json({ description });
}
