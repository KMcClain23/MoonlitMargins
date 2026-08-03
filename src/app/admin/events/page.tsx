import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import EventForm from "@/components/admin/EventForm";
import EventRow from "@/components/admin/EventRow";

export const dynamic = "force-dynamic";

// Filtered and ordered at the query level (same "view" pattern
// /admin/applications uses for its Active/Archived toggle) rather than
// fetching everything and splitting client-side -- Upcoming is soonest-
// first (ascending) since that's what you'd act on next; Past is most-
// recently-past-first (descending) since that's what you'd look up most.
// Matches the public /events page's own Upcoming/Past ordering.
async function getEvents(view: string) {
  const supabase = supabaseServer();
  const now = new Date().toISOString();
  const query =
    view === "past"
      ? supabase.from("events").select("*").lt("starts_at", now).order("starts_at", { ascending: false })
      : supabase.from("events").select("*").gte("starts_at", now).order("starts_at", { ascending: true });

  const { data } = await query;
  return data ?? [];
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "upcoming" } = await searchParams;
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  const events = await getEvents(view);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-voice text-3xl text-parchment">Events</h1>
        <div className="flex gap-2">
          {["upcoming", "past"].map((option) => (
            <Link
              key={option}
              href={`/admin/events?view=${option}`}
              className={`rounded-full border px-4 py-1.5 text-xs capitalize transition-colors ${
                view === option
                  ? "border-lilac bg-lilac text-ink"
                  : "border-muted/40 text-muted hover:border-parchment hover:text-parchment"
              }`}
            >
              {option}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <EventForm />
      </div>

      <div className="mt-8 space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted">{view === "past" ? "No past events." : "No upcoming events."}</p>
        ) : (
          events.map((event) => (
            <EventRow key={event.id} event={event} currentUserId={session?.adminUserId ?? ""} />
          ))
        )}
      </div>
    </div>
  );
}
