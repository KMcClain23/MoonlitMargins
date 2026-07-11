"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getVideoEmbed, detectMediaType } from "@/lib/videoEmbed";

export default function MediaUpload({
  name,
  initialValue,
}: {
  name: string;
  initialValue?: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [embedThumbnail, setEmbedThumbnail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const embed = getVideoEmbed(value);
  const mediaType = detectMediaType(value);
  const isDirectVideoFile = value && mediaType === "video" && !embed;
  const isImage = value && mediaType === "image";

  // No manual upload needed for a pasted YouTube/Vimeo link -- pull the
  // real screencap automatically so the preview isn't just a bare icon.
  useEffect(() => {
    if (!embed) {
      setEmbedThumbnail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/video-thumbnail?url=${encodeURIComponent(value)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEmbedThumbnail(data.thumbnailUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setEmbedThumbnail(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, embed?.provider]);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");

    try {
      const presignRes = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, folder: "memories" }),
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
      <span className="mb-2 block text-sm text-muted">Media</span>

      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-hairline bg-ink">
          {isImage ? <Image src={value} alt="" fill sizes="64px" className="object-cover" unoptimized /> : null}
          {isDirectVideoFile ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={value} className="h-full w-full object-cover" muted />
          ) : null}
          {embed && embedThumbnail ? (
            <Image src={embedThumbnail} alt="" fill sizes="64px" className="object-cover" unoptimized />
          ) : embed ? (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
              {embed.provider === "youtube" ? "YouTube" : "Vimeo"}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              name={name}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Upload a photo or video, or paste any link (including YouTube/Vimeo)"
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
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
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
