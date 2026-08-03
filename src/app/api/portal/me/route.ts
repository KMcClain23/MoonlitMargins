import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberSessionFromRequest } from "@/lib/memberAuth";

export async function GET(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = supabaseServer();
  // Every column, unlike GET /api/portal/contacts -- this is a member
  // reading her own record, so none of the contacts_share_* gating that
  // route applies to other members' data has any reason to apply here.
  const { data: member } = await supabase
    .from("members")
    .select(
      "id, full_name, role, bio, email, phone, photo_url, photo_zoom, photo_offset_x, photo_offset_y, socials, tier, state, country, contacts_hide_from_directory, contacts_share_last_name, contacts_share_email, contacts_share_phone, contacts_share_socials, contacts_share_photo, orientation_completed_at, mentor_admin_user_id"
    )
    .eq("id", session.memberId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: member.id,
    fullName: member.full_name,
    role: member.role,
    bio: member.bio,
    email: member.email,
    phone: member.phone,
    photoUrl: member.photo_url,
    photoZoom: member.photo_zoom,
    photoOffsetX: member.photo_offset_x,
    photoOffsetY: member.photo_offset_y,
    socials: member.socials,
    tier: member.tier,
    state: member.state,
    country: member.country,
    contactsHideFromDirectory: member.contacts_hide_from_directory,
    contactsShareLastName: member.contacts_share_last_name,
    contactsShareEmail: member.contacts_share_email,
    contactsSharePhone: member.contacts_share_phone,
    contactsShareSocials: member.contacts_share_socials,
    contactsSharePhoto: member.contacts_share_photo,
    orientationCompletedAt: member.orientation_completed_at,
    mentorAdminUserId: member.mentor_admin_user_id,
  });
}

const patchSchema = z.object({
  phone: z.string().nullable().optional(),
  contacts_hide_from_directory: z.boolean().optional(),
  contacts_share_last_name: z.boolean().optional(),
  contacts_share_email: z.boolean().optional(),
  contacts_share_phone: z.boolean().optional(),
  contacts_share_socials: z.boolean().optional(),
  contacts_share_photo: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = getMemberSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // A true partial update -- only the keys actually present in the
  // request are written, unlike the admin members PATCH route (which
  // always rewrites the whole row from a full form submit). A member
  // toggling just one sharing preference must never reset the others.
  const update = parsed.data;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: true });
  }

  const supabase = supabaseServer();

  // Scoped to session.memberId only -- there's no id in the request body
  // or URL for this route at all, so a member has no way to target any
  // row but her own.
  const { error } = await supabase.from("members").update(update).eq("id", session.memberId);

  if (error) {
    return NextResponse.json({ error: "Could not update your preferences" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
