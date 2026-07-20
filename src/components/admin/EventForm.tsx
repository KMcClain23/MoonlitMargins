"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/admin/ImageUpload";

const EVENT_TYPES = [
  { value: "reading_sprint", label: "Reading sprint" },
  { value: "tiktok_live", label: "TikTok live" },
  { value: "author_event", label: "Author event" },
  { value: "annual_meetup", label: "Annual meetup" },
  { value: "game_night", label: "Game night" },
  { value: "other", label: "Other" },
];

const TIER_OPTIONS = [
  { value: "founder", label: "Founder" },
  { value: "council", label: "Council" },
  { value: "junior_council", label: "Junior council" },
  { value: "member", label: "Member" },
];

type EventValues = {
  id?: string;
  title?: string;
  description?: string | null;
  event_type?: string;
  starts_at?: string;
  location?: string | null;
  link_url?: string | null;
  cover_image_url?: string | null;
  registration_type?: "rsvp" | "ticketing";
  status?: "scheduled" | "canceled";
  is_private?: boolean;
  target_tiers?: string[] | null;
};

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not an ISO string with Z.
function toDatetimeLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({
  event: existingEvent,
  onDone,
}: {
  event?: EventValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(existingEvent?.id);
  const [isPrivate, setIsPrivate] = useState(existingEvent?.is_private ?? false);
  const [selectedTiers, setSelectedTiers] = useState<string[]>(existingEvent?.target_tiers ?? []);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = formEvent.currentTarget;
    setLoading(true);
    setError("");

    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      eventType: String(formData.get("eventType") ?? "other"),
      startsAt: String(formData.get("startsAt") ?? ""),
      location: String(formData.get("location") ?? ""),
      linkUrl: String(formData.get("linkUrl") ?? ""),
      coverImageUrl: String(formData.get("coverImageUrl") ?? ""),
      registrationType: String(formData.get("registrationType") ?? "rsvp"),
      status: formData.get("canceled") === "on" ? "canceled" : "scheduled",
      isPrivate: formData.get("isPrivate") === "on",
      targetTiers: formData.get("isPrivate") === "on" ? selectedTiers : [],
    };

    const url = isEditing ? `/api/admin/events/${existingEvent!.id}` : "/api/admin/events";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      setError(`Couldn't ${isEditing ? "save" : "create"} that event. Check the fields and try again.`);
      return;
    }

    if (!isEditing) {
      form.reset();
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="font-voice text-lg text-parchment">{isEditing ? "Edit event" : "New event"}</p>
        {isEditing && onDone ? (
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-parchment">
            Cancel
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Title</span>
          <input name="title" required defaultValue={existingEvent?.title ?? ""} className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Type</span>
          <select name="eventType" required defaultValue={existingEvent?.event_type ?? "reading_sprint"} className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac">
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Starts at</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocal(existingEvent?.starts_at)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Location (or "Virtual")</span>
          <input name="location" defaultValue={existingEvent?.location ?? ""} className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">Registration</span>
          <select
            name="registrationType"
            defaultValue={existingEvent?.registration_type ?? "rsvp"}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          >
            <option value="rsvp">Free RSVP</option>
            <option value="ticketing">Ticketed</option>
          </select>
        </label>

        <div className="sm:col-span-2">
          <ImageUpload
            name="coverImageUrl"
            label="Cover image (e.g. the guest author's book cover)"
            folder="events"
            initialValue={existingEvent?.cover_image_url}
          />
        </div>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm text-muted">Link (TikTok Live, Zoom, etc.)</span>
          <input name="linkUrl" defaultValue={existingEvent?.link_url ?? ""} className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac" />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm text-muted">Description</span>
          <textarea name="description" rows={3} defaultValue={existingEvent?.description ?? ""} className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac" />
        </label>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            name="canceled"
            type="checkbox"
            defaultChecked={existingEvent?.status === "canceled"}
            className="h-4 w-4 rounded border-hairline"
          />
          <span className="text-sm text-muted">This event has been canceled</span>
        </label>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            name="isPrivate"
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 rounded border-hairline"
          />
          <span className="text-sm text-muted">
            Private event (hidden from the public /events listing; still reachable via direct link)
          </span>
        </label>

        {isPrivate ? (
          <div className="sm:col-span-2 rounded-lg border border-hairline p-4">
            <p className="mb-2 text-sm text-muted">
              Which tiers should be emailed the details? (Only members with an email on file will
              actually receive it -- add missing emails on the Members page.)
            </p>
            <div className="flex flex-wrap gap-4">
              {TIER_OPTIONS.map((tier) => (
                <label key={tier.value} className="flex items-center gap-2 text-sm text-parchment">
                  <input
                    type="checkbox"
                    checked={selectedTiers.includes(tier.value)}
                    onChange={(e) =>
                      setSelectedTiers((current) =>
                        e.target.checked ? [...current, tier.value] : current.filter((t) => t !== tier.value)
                      )
                    }
                    className="h-4 w-4 rounded border-hairline"
                  />
                  {tier.label}
                </label>
              ))}
            </div>
            {isEditing ? (
              <p className="mt-2 text-xs text-muted">
                Changing tiers here does not re-send invite emails -- those only go out once, when
                the event is first created.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-candle">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
      >
        {loading ? "Saving…" : isEditing ? "Save changes" : "Add event"}
      </button>
    </form>
  );
}
