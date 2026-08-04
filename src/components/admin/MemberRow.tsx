"use client";

import { useState } from "react";
import MemberForm from "@/components/admin/MemberForm";
import DeleteButton from "@/components/admin/DeleteButton";
import MemberAvatarImage from "@/components/MemberAvatarImage";
import type { SocialsMap } from "@/lib/socials";

type Member = {
  id: string;
  full_name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  photo_zoom: number;
  photo_offset_x: number;
  photo_offset_y: number;
  socials: SocialsMap | null;
  tier: "founder" | "council" | "junior_council" | "member";
  mentor_admin_user_id: string | null;
  password_hash: string | null;
};

type MentorOption = { id: string; full_name: string };
type OrientationStepOption = { id: string; title: string };

const TIER_LABELS: Record<Member["tier"], string> = {
  founder: "Founder",
  council: "Council",
  junior_council: "Junior council",
  member: "",
};

export default function MemberRow({
  member,
  mentorOptions,
  orientationSteps,
  assignedOrientationStepIds,
}: {
  member: Member;
  mentorOptions: MentorOption[];
  orientationSteps: OrientationStepOption[];
  assignedOrientationStepIds: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  if (editing) {
    return (
      <MemberForm
        member={member}
        mentorOptions={mentorOptions}
        orientationSteps={orientationSteps}
        assignedOrientationStepIds={assignedOrientationStepIds}
        onDone={() => setEditing(false)}
      />
    );
  }

  const mentorName = mentorOptions.find((m) => m.id === member.mentor_admin_user_id)?.full_name;

  async function handleInvite() {
    setInvitePending(true);
    setInviteUrl(null);
    const res = await fetch(`/api/admin/members/${member.id}/portal-invite`, { method: "POST" });
    setInvitePending(false);
    if (res.ok) {
      const data = await res.json();
      setInviteUrl(data.setupUrl);
    }
  }

  async function handleCopyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) -- the
      // link is still shown in the box below either way.
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="overflow-hidden rounded-full bg-surfaceRaised">
            {member.photo_url ? (
              <MemberAvatarImage
                src={member.photo_url}
                alt={member.full_name}
                size={40}
                zoom={member.photo_zoom}
                offsetX={member.photo_offset_x}
                offsetY={member.photo_offset_y}
              />
            ) : (
              <div style={{ width: 40, height: 40 }} />
            )}
          </div>
          <div>
            <p className="text-parchment">
              {member.full_name}
              {member.tier !== "member" ? (
                <span className="ml-2 rounded-full border border-lilac/40 px-2 py-0.5 text-[10px] text-lilac-soft">
                  {TIER_LABELS[member.tier]}
                </span>
              ) : null}
            </p>
            {member.role ? <p className="text-xs text-muted">{member.role}</p> : null}
            <p className="text-xs text-muted">Mentor: {mentorName ?? "Unassigned"}</p>
            <p className="text-xs text-muted">
              Portal access: {member.password_hash ? "Active" : "Not set up yet"}
            </p>
            <p className="text-xs text-muted">
              Orientation:{" "}
              {assignedOrientationStepIds.length > 0
                ? `${assignedOrientationStepIds.length} custom step${assignedOrientationStepIds.length === 1 ? "" : "s"}`
                : "Full checklist"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleInvite}
            disabled={invitePending}
            className="text-xs text-lilac-soft hover:underline disabled:opacity-50"
          >
            {invitePending ? "Generating…" : member.password_hash ? "Resend portal invite" : "Send portal invite"}
          </button>
          <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
            Edit
          </button>
          <DeleteButton endpoint={`/api/admin/members/${member.id}`} />
        </div>
      </div>

      {inviteUrl ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-ink px-3 py-2">
          <p className="break-all text-xs text-muted">{inviteUrl}</p>
          <button onClick={handleCopyInvite} className="shrink-0 text-xs text-lilac-soft hover:underline">
            {inviteCopied ? "Copied!" : "Copy link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
