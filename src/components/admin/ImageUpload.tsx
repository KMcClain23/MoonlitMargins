"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export default function ImageUpload({
  name,
  label,
  folder,
  initialValue,
  onValueChange,
}: {
  name: string;
  label: string;
  folder: "members" | "memories" | "events";
  initialValue?: string | null;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValueState] = useState(initialValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setValue(next: string) {
    setValueState(next);
    onValueChange?.(next);
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError("");

    try {
      const presignRes = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, folder }),
      });

      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not prepare the upload");
      }

      const { uploadUrl, publicUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Upload to storage failed");
      }

      setValue(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-2 block text-sm text-muted">{label}</span>

      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-hairline bg-ink">
          {value ? (
            <Image src={value} alt="" fill sizes="64px" className="object-cover" unoptimized />
          ) : null}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              name={name}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Upload a photo, or paste a URL"
              className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted/50 focus:border-lilac"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 rounded-lg border border-hairline px-3 py-2 text-sm text-muted transition-colors hover:border-lilac hover:text-parchment disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          {error ? <p className="text-xs text-candle">{error}</p> : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
