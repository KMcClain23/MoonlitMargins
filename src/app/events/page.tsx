import type { Metadata } from "next";
import Chapter from "@/components/Chapter";
import EventsView from "@/components/EventsView";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

const TITLE = "Upcoming Book Club Events & Meetups";
const DESCRIPTION =
  "See upcoming reading sprints, TikTok lives, author events, and the annual sisterhood meetup: all the ways to show up with The Moonlit Margins Sisterhood.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/events" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/events"),
    siteName: SITE_NAME,
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

async function getAllEvents() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("events")
    .select("id, slug, title, description, event_type, starts_at, location, link_url, cover_image_url, registration_type, status")
    .eq("is_private", false)
    .order("starts_at", { ascending: true });
  return data ?? [];
}

export default async function EventsPage() {
  const allEvents = await getAllEvents();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="relative overflow-hidden rounded-2xl">
        <div className="starfield-subtle" aria-hidden="true" />
        <div className="relative">
          <Chapter number="one" title="What's coming up" />
          <h1 className="font-voice text-4xl text-parchment">Upcoming Book Club Events.</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Reading sprints, TikTok lives, author events, and the annual meetup,
            all in one place.
          </p>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Not a member yet?{" "}
            <a href="/join" className="text-lilac-soft underline decoration-hairline underline-offset-2 hover:text-parchment">
              Join the sisterhood
            </a>{" "}
            to RSVP for what&rsquo;s next.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <EventsView events={allEvents} />
      </div>
    </section>
  );
}
