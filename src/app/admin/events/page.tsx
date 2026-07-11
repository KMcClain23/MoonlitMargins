import { supabaseServer } from "@/lib/supabase/server";
import EventForm from "@/components/admin/EventForm";
import EventRow from "@/components/admin/EventRow";

export const dynamic = "force-dynamic";

async function getEvents() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });
  return data ?? [];
}

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Events</h1>

      <div className="mt-6">
        <EventForm />
      </div>

      <div className="mt-8 space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted">No events yet.</p>
        ) : (
          events.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
