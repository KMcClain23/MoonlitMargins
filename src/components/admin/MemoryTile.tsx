"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import MemoryForm from "@/components/admin/MemoryForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { getVideoEmbed, detectMediaType } from "@/lib/videoEmbed";

type Memory = {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
};

export default function MemoryTile({ memory }: { memory: Memory }) {
  const [editing, setEditing] = useState(false);
  const [autoThumbnail, setAutoThumbnail] = useState<string | null>(null);

  const embed = getVideoEmbed(memory.image_url);
  const isVideo = detectMediaType(memory.image_url) === "video";
  const isDirectVideoFile = isVideo && !embed;
  const cover = memory.thumbnail_url || autoThumbnail;

  useEffect(() => {
    if (!embed || memory.thumbnail_url) return;
    let cancelled = false;
    fetch(`/api/video-thumbnail?url=${encodeURIComponent(memory.image_url)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAutoThumbnail(data.thumbnailUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setAutoThumbnail(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory.image_url, memory.thumbnail_url]);

  if (editing) {
    return (
      <div className="col-span-full">
        <MemoryForm memory={memory} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div className="relative aspect-square bg-ink">
        {!isVideo ? (
          <Image src={memory.image_url} alt={memory.caption ?? "Memory"} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
        ) : null}

        {isDirectVideoFile && !cover ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={memory.image_url} className="h-full w-full object-cover" muted />
        ) : null}

        {isVideo && cover ? (
          <>
            <Image src={cover} alt={memory.caption ?? "Memory"} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" unoptimized />
            <div className="absolute inset-0 flex items-center justify-center bg-ink/20">
              <Play size={28} className="text-parchment drop-shadow" />
            </div>
          </>
        ) : null}

        {isVideo && !cover && embed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
            <Play size={28} />
            <span className="text-xs">{embed.provider === "youtube" ? "YouTube" : "Vimeo"}</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between p-3">
        <p className="truncate text-xs text-muted">{memory.caption || "Untitled"}</p>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setEditing(true)} className="text-xs text-lilac-soft hover:underline">
            Edit
          </button>
          <DeleteButton endpoint={`/api/admin/memories/${memory.id}`} />
        </div>
      </div>
    </div>
  );
}
