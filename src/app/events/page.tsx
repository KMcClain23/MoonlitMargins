import Chapter from "@/components/Chapter";
import EventsView from "@/components/EventsView";
import { supabaseServer } from "@/lib/supabase/server";

export const revalidate = 300;

async function getAllEvents() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("events")
    .select("id, slug, title, description, event_type, starts_at, location, link_url, cover_image_url, registration_type, status")
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
          <h1 className="font-voice text-4xl text-parchment">Events.</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Reading sprints, TikTok lives, author events, and the annual meetup,
            all in one place.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <EventsView events={allEvents} />
      </div>
    </section>
  );
}
