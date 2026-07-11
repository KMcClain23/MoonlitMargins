"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import MediaUpload from "@/components/admin/MediaUpload";
import ImageUpload from "@/components/admin/ImageUpload";

type MemoryValues = {
  id?: string;
  image_url?: string;
  thumbnail_url?: string | null;
  caption?: string | null;
};

export default function MemoryForm({
  memory,
  onDone,
}: {
  memory?: MemoryValues;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(memory?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setError("");

    const formData = new FormData(form);
    const payload = {
      imageUrl: String(formData.get("imageUrl") ?? ""),
      thumbnailUrl: String(formData.get("thumbnailUrl") ?? ""),
      caption: String(formData.get("caption") ?? ""),
    };

    const url = isEditing ? `/api/admin/memories/${memory!.id}` : "/api/admin/memories";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      setError(`Couldn't ${isEditing ? "save" : "add"} that. Check the fields and try again.`);
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
        <p className="font-voice text-lg text-parchment">{isEditing ? "Edit memory" : "New memory"}</p>
        {isEditing && onDone ? (
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-parchment">
            Cancel
          </button>
        ) : null}
      </div>

      <MediaUpload name="imageUrl" initialValue={memory?.image_url} />

      <div className="border-t border-hairline pt-4">
        <ImageUpload
          name="thumbnailUrl"
          label="Cover image (optional -- only needed if one doesn't auto-populate)"
          folder="memories"
          initialValue={memory?.thumbnail_url}
        />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm text-muted">Caption</span>
        <input
          name="caption"
          defaultValue={memory?.caption ?? ""}
          className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
        />
      </label>

      {error ? <p className="text-sm text-candle">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
      >
        {loading ? "Saving…" : isEditing ? "Save changes" : "Add memory"}
      </button>
    </form>
  );
}
