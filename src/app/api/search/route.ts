import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type SearchResult = {
  type: "page" | "event" | "member";
  title: string;
  snippet: string;
  href: string;
};

// Static pages aren't in a database, so they're searched by simple keyword
// matching against a small hand-maintained list.
const PAGES: Array<{ title: string; keywords: string[]; href: string; snippet: string }> = [
  {
    title: "Join the Sisterhood",
    keywords: ["join", "apply", "application", "member", "membership"],
    href: "/join",
    snippet: "Apply to become a member of the sisterhood.",
  },
  {
    title: "The Sisterhood",
    keywords: ["sisterhood", "leadership", "founder", "council", "members", "kaya", "aleia"],
    href: "/sisterhood",
    snippet: "Meet the founders, leadership council, and members.",
  },
  {
    title: "Events",
    keywords: ["events", "calendar", "reading sprint", "tiktok live", "meetup"],
    href: "/events",
    snippet: "Reading sprints, TikTok lives, author events, and the annual meetup.",
  },
  {
    title: "Memories",
    keywords: ["memories", "photos", "videos", "gallery"],
    href: "/memories",
    snippet: "Photos and videos from meetups and reading sprints.",
  },
  {
    title: "Interview with Us",
    keywords: ["interview", "narrator", "author feature"],
    href: "/interview",
    snippet: "For narrators and authors who want to be interviewed.",
  },
  {
    title: "Collab with Us",
    keywords: ["collab", "collaboration", "author", "book of the month"],
    href: "/collab",
    snippet: "For authors who want their book featured with the club.",
  },
];

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: SearchResult[] = [];
  const lowerQ = q.toLowerCase();

  for (const page of PAGES) {
    if (page.title.toLowerCase().includes(lowerQ) || page.keywords.some((k) => k.includes(lowerQ))) {
      results.push({ type: "page", title: page.title, snippet: page.snippet, href: page.href });
    }
  }

  const supabase = supabaseServer();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, starts_at")
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(5);

  for (const event of events ?? []) {
    results.push({
      type: "event",
      title: event.title,
      snippet: new Date(event.starts_at).toLocaleDateString("en-US", { dateStyle: "medium" }),
      href: "/events",
    });
  }

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, role")
    .or(`full_name.ilike.%${q}%,role.ilike.%${q}%`)
    .limit(5);

  for (const member of members ?? []) {
    results.push({
      type: "member",
      title: member.full_name,
      snippet: member.role ?? "Member of the sisterhood",
      href: "/sisterhood",
    });
  }

  return NextResponse.json({ results });
}
