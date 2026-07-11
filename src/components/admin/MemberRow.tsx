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
};

const TIER_LABELS: Record<Member["tier"], string> = {
  founder: "Founder",
  council: "Council",
  junior_council: "Junior council",
  member: "",
};

export default function MemberRow({ member }: { member: Member }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <MemberForm member={member} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface p-4">
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
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
          Edit
        </button>
        <DeleteButton endpoint={`/api/admin/members/${member.id}`} />
      </div>
    </div>
  );
}
