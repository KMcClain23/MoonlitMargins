import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getSessionFromRequest } from "@/lib/adminAuth";
import { sendExpoPushToAdminUsers } from "@/lib/messaging";

const createSchema = z.object({
  type: z.enum(["access_request", "feedback", "bug"]),
  subject: z.string().min(1),
  message: z.string().min(1),
});

// Same precedent as Users management: creating a ticket is open to any
// authenticated admin_user (no section gate), but viewing/managing the
// full list is owner-only -- enforced per-method below rather than in
// middleware, since "tickets" isn't a section in adminSections.ts.
function requireOwner(request: NextRequest) {
  const session = getSessionFromRequest(request);
  return session?.role === "owner" ? session : null;
}

// Sorts open-first, then in_progress, then resolved -- newest first within
// each group, so an owner working the queue sees what still needs
// attention before older, already-handled tickets.
const STATUS_ORDER: Record<string, number> = { open: 0, in_progress: 1, resolved: 2 };

export async function GET(request: NextRequest) {
  const session = requireOwner(request);
  if (!session) {
    return NextResponse.json({ error: "Only the owner can view tickets" }, { status: 403 });
  }

  const supabase = supabaseServer();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, admin_user_id, type, subject, message, status, resolved_by, resolved_at, created_at");

  const { data: adminUsers } = await supabase.from("admin_users").select("id, full_name");
  const nameById = new Map((adminUsers ?? []).map((u) => [u.id, u.full_name]));

  const sorted = (tickets ?? []).slice().sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
    if (statusDiff !== 0) return statusDiff;
    return (b.created_at as string).localeCompare(a.created_at as string);
  });

  return NextResponse.json({
    tickets: sorted.map((t) => ({
      id: t.id,
      type: t.type,
      subject: t.subject,
      message: t.message,
      status: t.status,
      adminUserId: t.admin_user_id,
      submitterName: nameById.get(t.admin_user_id) ?? "Unknown",
      resolvedBy: t.resolved_by,
      resolvedAt: t.resolved_at,
      createdAt: t.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { type, subject, message } = parsed.data;
  const supabase = supabaseServer();

  const { data: created, error } = await supabase
    .from("support_tickets")
    .insert({
      admin_user_id: session.adminUserId,
      type,
      subject,
      message,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: "Could not submit that ticket" }, { status: 500 });
  }

  // Best-effort, same "never block the real action" rule as every other
  // push notification in this app -- a failed/slow Expo send must not
  // affect the ticket actually being recorded.
  try {
    const { data: owners } = await supabase.from("admin_users").select("id").eq("role", "owner");
    const ownerIds = (owners ?? []).map((o) => o.id as string);
    const truncatedBody = message.length > 100 ? `${message.slice(0, 100)}…` : message;

    await sendExpoPushToAdminUsers(supabase, ownerIds, {
      title: `New ticket: ${subject}`,
      body: truncatedBody,
      data: { ticketId: created.id },
    });
  } catch (err) {
    console.error("Ticket push notification failed", err);
  }

  return NextResponse.json({ success: true, ticketId: created.id });
}
