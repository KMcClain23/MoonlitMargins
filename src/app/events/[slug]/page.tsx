import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import EventRsvpSection from "@/components/EventRsvpSection";
import ShareRow from "@/components/ShareRow";

export const revalidate = 300;

const TYPE_LABELS: Record<string, string> = {
  reading_sprint: "Reading sprint",
  tiktok_live: "TikTok live",
  author_event: "Author event",
  annual_meetup: "Annual meetup",
  other: "Event",
};

async function getEvent(slug: string) {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("events")
    .select(
      "id, title, description, event_type, starts_at, ends_at, location, link_url, cover_image_url, registration_type, status"
    )
    .eq("slug", slug)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event | The Moonlit Margins Sisterhood" };
  return {
    title: `${event.title} | The Moonlit Margins Sisterhood`,
    description: event.description ?? undefined,
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const isPast = new Date(event.starts_at) < new Date();
  const dateRange = event.ends_at
    ? `${new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} – ${new Date(
        event.ends_at
      ).toLocaleTimeString("en-US", { timeStyle: "short" })}`
    : new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/events" className="text-sm text-muted underline decoration-hairline underline-offset-2 hover:text-lilac-soft">
        ← Back to events
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <p className="eyebrow">{TYPE_LABELS[event.event_type] ?? "Event"}</p>
        {event.status === "canceled" ? (
          <span className="rounded-full border border-candle/40 px-2 py-0.5 text-[10px] text-candle">Canceled</span>
        ) : event.registration_type === "ticketing" ? (
          <span className="rounded-full border border-lilac/40 px-2 py-0.5 text-[10px] text-lilac-soft">Tickets</span>
        ) : null}
      </div>

      <h1 className="mt-3 font-voice text-3xl text-parchment sm:text-4xl">{event.title}</h1>
      <p className="mt-3 text-sm text-lilac-soft">
        {dateRange}
        {event.location ? ` · ${event.location}` : " · Virtual"}
      </p>

      {event.description ? (
        <p className="mt-6 text-sm leading-relaxed text-muted">{event.description}</p>
      ) : null}

      <div className="mt-8">
        <EventRsvpSection
          eventId={event.id}
          registrationType={event.registration_type}
          status={event.status}
          isPast={isPast}
          linkUrl={event.link_url}
        />
      </div>

      {event.cover_image_url ? (
        <div className="relative mt-12 aspect-video w-full overflow-hidden rounded-2xl border border-hairline bg-surfaceRaised">
          <Image src={event.cover_image_url} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      ) : null}

      <div className="mt-12 space-y-4 border-t border-hairline pt-8">
        <div>
          <p className="mb-1 font-voice text-lg text-parchment">Time &amp; location</p>
          <p className="text-sm text-muted">{dateRange}</p>
          <p className="text-sm text-muted">{event.location ?? "Virtual"}</p>
        </div>

        <ShareRow />
      </div>
    </section>
  );
}
