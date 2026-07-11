import { NextRequest, NextResponse } from "next/server";
import { resolveVideoTitle } from "@/lib/videoEmbed";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ title: null });
  }

  const title = await resolveVideoTitle(url);
  return NextResponse.json({ title });
}
