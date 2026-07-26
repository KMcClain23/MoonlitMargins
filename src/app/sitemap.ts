import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo";

// Same "published, non-private" query events/page.tsx already uses for the
// public events list -- a canceled event still has a real, indexable page
// (its own detail page just shows a "Canceled" badge), so status isn't
// filtered on here.
async function getPublishedEventSlugs(): Promise<string[]> {
  const supabase = supabaseServer();
  const { data } = await supabase.from("events").select("slug").eq("is_private", false);
  return (data ?? []).map((row) => row.slug);
}

// STATIC_PAGES deliberately excludes /interview and /collab -- both are
// pure redirect stubs to /partner (see those files' own comments), so a
// crawler following either just lands on /partner anyway; listing the
// redirects themselves would just add noise pointing at duplicate content.
const STATIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/sisterhood", changeFrequency: "monthly", priority: 0.8 },
  { path: "/events", changeFrequency: "daily", priority: 0.9 },
  { path: "/memories", changeFrequency: "weekly", priority: 0.6 },
  { path: "/join", changeFrequency: "monthly", priority: 0.9 },
  { path: "/partner", changeFrequency: "monthly", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const eventSlugs = await getPublishedEventSlugs();

  return [
    ...STATIC_PAGES.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...eventSlugs.map((slug) => ({
      url: absoluteUrl(`/events/${slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
