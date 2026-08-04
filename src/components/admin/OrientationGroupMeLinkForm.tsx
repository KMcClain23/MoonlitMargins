"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type LinkValues = {
  id?: string;
  label?: string;
  url?: string;
};

export default function OrientationGroupMeLinkForm({ link, onDone }: { link?: LinkValues; onDone?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(link?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setError("");

    const formData = new FormData(form);
    const payload = {
      label: String(formData.get("label") ?? ""),
      url: String(formData.get("url") ?? ""),
    };

    const url = isEditing ? `/api/admin/orientation-groupme-links/${link!.id}` : "/api/admin/orientation-groupme-links";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      setError(`Couldn't ${isEditing ? "save" : "add"} that link. Check the fields and try again.`);
      return;
    }

    if (!isEditing) {
      form.reset();
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="font-voice text-lg text-parchment">{isEditing ? "Edit link" : "New GroupMe link"}</p>
        {isEditing && onDone ? (
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-parchment">
            Cancel
          </button>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">Label</span>
        <input
          name="label"
          required
          defaultValue={link?.label ?? ""}
          placeholder="e.g. General Chat"
          className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">GroupMe URL</span>
        <input
          name="url"
          type="url"
          required
          defaultValue={link?.url ?? ""}
          placeholder="https://groupme.com/join_group/..."
          className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
        />
      </label>

      {error ? <p className="text-sm text-candle">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
      >
        {loading ? "Saving…" : isEditing ? "Save changes" : "Add link"}
      </button>
    </form>
  );
}
