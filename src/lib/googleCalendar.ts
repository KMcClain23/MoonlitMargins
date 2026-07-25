import { createSign } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

/**
 * Exchanges the Calendar service account's credentials for a short-lived
 * access token, via Google's OAuth2 JWT-bearer flow -- the exact same
 * approach as googleSheets.ts's own getAccessToken(), implemented
 * directly with Node's built-in crypto rather than pulling in googleapis
 * or google-auth-library. Kept as a separate copy (not a shared helper)
 * since this targets a different scope and a distinct, Calendar-specific
 * service account credential pair from the one Sheets sync uses.
 */
async function getAccessToken(): Promise<string | null> {
  const rawEmail = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!rawEmail || !rawKey) {
    console.warn(
      "[googleCalendar] Missing GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL or GOOGLE_CALENDAR_SERVICE_ACCOUNT_PRIVATE_KEY"
    );
    return null;
  }

  // Strip a surrounding pair of double quotes: harmless if absent, but
  // necessary when the value was pasted in verbatim (quotes and all)
  // somewhere that stores env var values completely literally, like
  // Vercel's dashboard/CLI. Without this, stray quote characters corrupt
  // the PEM structure and Node's crypto.sign() rejects it outright.
  const email = rawEmail.replace(/^"|"$/g, "");
  const privateKey = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: email,
      scope: CALENDAR_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  let signature: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    signer.end();
    signature = signer.sign(privateKey).toString("base64url");
  } catch (err) {
    console.error("[googleCalendar] Failed to sign JWT -- private key is likely malformed:", err);
    return null;
  }

  const jwt = `${header}.${claims}.${signature}`;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      console.error("[googleCalendar] Token exchange failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    if (typeof data.access_token !== "string") {
      console.error("[googleCalendar] Token response had no access_token:", data);
      return null;
    }
    return data.access_token;
  } catch (err) {
    console.error("[googleCalendar] Token request threw:", err);
    return null;
  }
}

function getCalendarId(): string | null {
  const raw = process.env.GOOGLE_CALENDAR_ID;
  if (!raw) {
    console.warn("[googleCalendar] Missing GOOGLE_CALENDAR_ID");
    return null;
  }
  return raw.replace(/^"|"$/g, "");
}

export interface PlannerEventForGoogle {
  title: string;
  description: string | null;
  location: string | null;
  /** ISO 8601. For an all-day event this is truncated to just the date
   * part below -- see the caveat on toGoogleDateTime(). */
  startTime: string;
  endTime: string;
  allDay: boolean;
  recurrenceRule: string | null;
}

// Google's all-day "date" fields use an EXCLUSIVE end date (a one-day
// event has end.date the day AFTER start.date) -- this project's own
// planner UI (not built as of this file) may or may not follow that same
// convention for its stored end_time. Whoever builds that UI should
// confirm its all-day end-date semantics match this before relying on
// all-day sync being pixel-perfect; timed (non-all-day) events have no
// such ambiguity.
function toGoogleDateTime(iso: string, allDay: boolean): { date: string } | { dateTime: string } {
  return allDay ? { date: iso.slice(0, 10) } : { dateTime: iso };
}

function toGoogleEventBody(event: PlannerEventForGoogle) {
  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: toGoogleDateTime(event.startTime, event.allDay),
    end: toGoogleDateTime(event.endTime, event.allDay),
    recurrence: event.recurrenceRule ? [`RRULE:${event.recurrenceRule}`] : undefined,
  };
}

/** Creates the event on the shared Google Calendar, returning its Google
 * event ID on success or null on any failure (missing config, network
 * error, non-2xx response) -- callers treat null as "sync didn't happen
 * this time," never as a reason to fail the local operation. */
export async function createGoogleCalendarEvent(event: PlannerEventForGoogle): Promise<string | null> {
  const calendarId = getCalendarId();
  if (!calendarId) return null;
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(toGoogleEventBody(event)),
    });
    if (!res.ok) {
      console.error("[googleCalendar] Create failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return typeof data.id === "string" ? data.id : null;
  } catch (err) {
    console.error("[googleCalendar] Create request threw:", err);
    return null;
  }
}

/** Best-effort -- returns whether it succeeded, never throws. */
export async function updateGoogleCalendarEvent(googleEventId: string, event: PlannerEventForGoogle): Promise<boolean> {
  const calendarId = getCalendarId();
  if (!calendarId) return false;
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(toGoogleEventBody(event)),
      }
    );
    if (!res.ok) {
      console.error("[googleCalendar] Update failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[googleCalendar] Update request threw:", err);
    return false;
  }
}

/** Best-effort -- returns whether it succeeded, never throws. A 404/410
 * (already gone on Google's side) counts as success -- the end state
 * (event not on the calendar) is exactly what was wanted either way. */
export async function deleteGoogleCalendarEvent(googleEventId: string): Promise<boolean> {
  const calendarId = getCalendarId();
  if (!calendarId) return false;
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error("[googleCalendar] Delete failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[googleCalendar] Delete request threw:", err);
    return false;
  }
}

export interface GoogleCalendarEventItem {
  id: string;
  status: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  recurrence?: string[];
  /** Present only on a single modified occurrence of a recurring event
   * (an "exception instance") -- planner_events has no way to represent
   * that (one row = one whole series), so callers should skip these. */
  recurringEventId?: string;
}

export interface GoogleCalendarChanges {
  events: GoogleCalendarEventItem[];
  /** Null if Google's response never included one (shouldn't normally
   * happen once pagination is fully drained, but defensively possible) --
   * callers should only persist a non-null token. */
  nextSyncToken: string | null;
}

// First-run window when there's no syncToken yet to resume from.
const FULL_SYNC_PAST_MONTHS = 1;
const FULL_SYNC_FUTURE_MONTHS = 6;

/**
 * Pulls changed/new/cancelled events from the shared Google Calendar.
 * With a syncToken, this is a true incremental sync (only what changed
 * since that token was issued, across the whole calendar -- Google's API
 * doesn't allow combining syncToken with a time window). Without one
 * (first run, or after a stale/expired token), this instead does a full
 * sync bounded to a reasonable window and returns a fresh syncToken to
 * resume from next time.
 */
export async function listGoogleCalendarChanges(syncToken?: string | null): Promise<GoogleCalendarChanges | null> {
  const calendarId = getCalendarId();
  if (!calendarId) return null;
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const events: GoogleCalendarEventItem[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  try {
    do {
      const params = new URLSearchParams({ showDeleted: "true", singleEvents: "false" });
      if (pageToken) params.set("pageToken", pageToken);

      if (syncToken) {
        params.set("syncToken", syncToken);
      } else {
        const now = new Date();
        const timeMin = new Date(now);
        timeMin.setMonth(timeMin.getMonth() - FULL_SYNC_PAST_MONTHS);
        const timeMax = new Date(now);
        timeMax.setMonth(timeMax.getMonth() + FULL_SYNC_FUTURE_MONTHS);
        params.set("timeMin", timeMin.toISOString());
        params.set("timeMax", timeMax.toISOString());
      }

      const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        // 410 Gone means the stored syncToken is stale/invalid (expired,
        // or the calendar's changed too much to resume from it) --
        // Google's documented signal to fall back to a full resync.
        if (res.status === 410 && syncToken) {
          console.warn("[googleCalendar] syncToken expired -- falling back to a full resync");
          return listGoogleCalendarChanges(null);
        }
        console.error("[googleCalendar] List events failed:", res.status, await res.text());
        return null;
      }

      const data = await res.json();
      events.push(...(data.items ?? []));
      pageToken = data.nextPageToken;
      // Only the LAST page of a multi-page response carries
      // nextSyncToken -- earlier pages carry nextPageToken instead, the
      // two are mutually exclusive per page.
      if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
    } while (pageToken);

    return { events, nextSyncToken };
  } catch (err) {
    console.error("[googleCalendar] List events request threw:", err);
    return null;
  }
}

/** Reads a single value from the generic app_sync_state key-value table. */
export async function getSyncState(key: string): Promise<string | null> {
  const supabase = supabaseServer();
  const { data } = await supabase.from("app_sync_state").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

/** Upserts a single value in the generic app_sync_state key-value table. */
export async function setSyncState(key: string, value: string): Promise<void> {
  const supabase = supabaseServer();
  await supabase.from("app_sync_state").upsert({ key, value });
}
