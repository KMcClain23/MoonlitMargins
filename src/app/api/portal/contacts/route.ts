import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest, memberSessionHasAdminSection } from "@/lib/memberAuth";

const TIER_ORDER = ["founder", "council", "junior_council", "member"] as const;

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const [firstName, ...rest] = parts;
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

export async function GET(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!memberSessionHasAdminSection(session, "contacts")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = supabaseServer();
  const { data: members } = await supabase
    .from("members")
    .select(
      "id, full_name, tier, email, phone, socials, photo_url, photo_zoom, photo_offset_x, photo_offset_y, contacts_share_last_name, contacts_share_email, contacts_share_phone, contacts_share_socials, contacts_share_photo"
    )
    .eq("contacts_hide_from_directory", false);

  // Flat array, ordered tier-first (founder, council, junior_council,
  // member) then alphabetically within each tier -- the frontend groups
  // visually by iterating this order, rather than the API nesting by tier
  // itself.
  const sorted = (members ?? []).slice().sort((a, b) => {
    const tierDiff =
      TIER_ORDER.indexOf(a.tier as (typeof TIER_ORDER)[number]) -
      TIER_ORDER.indexOf(b.tier as (typeof TIER_ORDER)[number]);
    if (tierDiff !== 0) return tierDiff;
    return (a.full_name as string).localeCompare(b.full_name as string);
  });

  const contacts = sorted.map((m) => {
    const { firstName, lastName } = splitName(m.full_name as string);

    // firstName and tier are the only fields every entry always has --
    // everything else is included ONLY when its own contacts_share_*
    // flag is true, and left out of the object entirely (not set to
    // null) otherwise, so the frontend can never accidentally render a
    // field a member opted out of sharing.
    const contact: Record<string, unknown> = { id: m.id, firstName, tier: m.tier };

    if (m.contacts_share_last_name && lastName) {
      contact.lastName = lastName;
    }
    if (m.contacts_share_photo) {
      contact.photoUrl = m.photo_url;
      contact.photoZoom = m.photo_zoom;
      contact.photoOffsetX = m.photo_offset_x;
      contact.photoOffsetY = m.photo_offset_y;
    }
    if (m.contacts_share_email && m.email) {
      contact.email = m.email;
    }
    if (m.contacts_share_phone && m.phone) {
      contact.phone = m.phone;
    }
    if (m.contacts_share_socials && m.socials) {
      contact.socials = m.socials;
    }

    return contact;
  });

  return NextResponse.json({ contacts });
}
