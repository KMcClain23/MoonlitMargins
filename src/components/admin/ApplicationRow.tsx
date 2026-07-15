"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Application = {
  id: string;
  kind: "member" | "interview" | "collab";
  status: "pending" | "in_review" | "accepted" | "declined";
  full_name: string;
  email: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  answers: Record<string, string>;
  created_at: string;
};

const STATUS_STYLES: Record<Application["status"], string> = {
  pending: "text-candle border-candle/40",
  in_review: "text-lilac-soft border-lilac/40",
  accepted: "text-parchment border-parchment/40",
  declined: "text-muted border-muted/40",
};

export default function ApplicationRow({ application }: { application: Application }) {
  const router = useRouter();
  const [status, setStatus] = useState(application.status);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function updateStatus(next: Application["status"]) {
    setLoading(true);
    const res = await fetch(`/api/admin/applications/${application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(false);
    if (res.ok) {
      setStatus(next);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${application.full_name}'s application? This can't be undone.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/applications/${application.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert("Couldn't delete that application.");
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-voice text-lg text-parchment">{application.full_name}</p>
          <p className="text-sm text-muted">{application.email}</p>
          {application.instagram_handle || application.tiktok_handle ? (
            <p className="mt-1 text-xs text-muted">
              {application.instagram_handle ? `IG: ${application.instagram_handle}` : ""}
              {application.instagram_handle && application.tiktok_handle ? " · " : ""}
              {application.tiktok_handle ? `TikTok: ${application.tiktok_handle}` : ""}
            </p>
          ) : null}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLES[status]}`}>
          {status.replace("_", " ")}
        </span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-lilac-soft hover:underline"
      >
        {expanded ? "Hide answers" : "Show answers"}
      </button>

      {expanded ? (
        <dl className="mt-3 space-y-2 border-t border-hairline pt-3">
          {Object.entries(application.answers).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-muted">
                {key.replace(/([A-Z])/g, " $1")}
              </dt>
              <dd className="text-sm text-parchment/90">{value || "Not answered"}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton
          label="Mark in review"
          active={status === "in_review"}
          disabled={loading}
          onClick={() => updateStatus("in_review")}
        />
        <ActionButton
          label="Accept"
          active={status === "accepted"}
          disabled={loading}
          onClick={() => updateStatus("accepted")}
        />
        <ActionButton
          label="Decline"
          active={status === "declined"}
          disabled={loading}
          onClick={() => updateStatus("declined")}
        />
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-full border border-candle/40 px-4 py-1.5 text-xs text-candle transition-colors hover:bg-candle/10 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-1.5 text-xs transition-colors disabled:opacity-50 ${
        active
          ? "border-lilac bg-lilac text-ink"
          : "border-muted/40 text-muted hover:border-parchment hover:text-parchment"
      }`}
    >
      {label}
    </button>
  );
}
