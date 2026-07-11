import Image from "next/image";
import { Play } from "lucide-react";
import Chapter from "@/components/Chapter";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getVideoEmbed,
  detectMediaType,
  resolveVideoThumbnail,
  resolveVideoTitle,
  resolveVideoDescription,
  resolveVideoPublishedAt,
} from "@/lib/videoEmbed";

export const revalidate = 3600;

type Memory = {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  title: string | null;
  caption: string | null;
  published_at: string | null;
  created_at: string;
};

async function getMemories(): Promise<Memory[]> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("memories")
    .select("id, image_url, thumbnail_url, title, caption, published_at, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function MemoriesPage() {
  const memories = await getMemories();

  // Resolve real screencaps for embed links that don't already have a
  // manual cover set -- server-side, so the page never tries to embed a
  // live player (some video owners disable that entirely).
  const autoThumbnails = new Map<string, string | null>();
  await Promise.all(
    memories
      .filter((m) => !m.thumbnail_url && getVideoEmbed(m.image_url))
      .map(async (m) => {
        autoThumbnails.set(m.id, await resolveVideoThumbnail(m.image_url));
      })
  );

  // Same idea for titles -- covers video memories added before the title
  // field existed, or ones where it was cleared out.
  const autoTitles = new Map<string, string | null>();
  await Promise.all(
    memories
      .filter((m) => !m.title && getVideoEmbed(m.image_url))
      .map(async (m) => {
        autoTitles.set(m.id, await resolveVideoTitle(m.image_url));
      })
  );

  // And for captions -- only resolves for Vimeo links, since YouTube's
  // oEmbed has no description field to fall back to.
  const autoCaptions = new Map<string, string | null>();
  await Promise.all(
    memories
      .filter((m) => !m.caption && getVideoEmbed(m.image_url))
      .map(async (m) => {
        autoCaptions.set(m.id, await resolveVideoDescription(m.image_url));
      })
  );

  // Resolve each video's real upload date (YouTube only, needs
  // YOUTUBE_API_KEY -- silently a no-op without it) so memories can be
  // sorted by when the content actually went up, not by whenever it
  // happened to get added here.
  const autoPublishedAt = new Map<string, string | null>();
  await Promise.all(
    memories
      .filter((m) => !m.published_at && getVideoEmbed(m.image_url))
      .map(async (m) => {
        autoPublishedAt.set(m.id, await resolveVideoPublishedAt(m.image_url));
      })
  );

  // Sort by the real publish date when known, falling back to when the row
  // was added here for anything without one (photos, direct video files,
  // or videos where the date couldn't be resolved).
  const sorted = [...memories].sort((a, b) => {
    const aDate = a.published_at || autoPublishedAt.get(a.id) || a.created_at;
    const bDate = b.published_at || autoPublishedAt.get(b.id) || b.created_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Chapter number="one" title="Looking back" />
      <h1 className="font-voice text-4xl text-parchment">Memories.</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
        Moments from meetups, reading sprints, and everything in between.
      </p>

      {memories.length === 0 ? (
        <p className="mt-12 text-sm text-muted">
          We&rsquo;re still gathering photos from our first year. This page
          will fill in fast after the next meetup.
        </p>
      ) : (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {sorted.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              cover={memory.thumbnail_url || autoThumbnails.get(memory.id) || null}
              resolvedTitle={memory.title || autoTitles.get(memory.id) || null}
              resolvedCaption={memory.caption || autoCaptions.get(memory.id) || null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MemoryCard({
  memory,
  cover,
  resolvedTitle,
  resolvedCaption,
}: {
  memory: Memory;
  cover: string | null;
  resolvedTitle: string | null;
  resolvedCaption: string | null;
}) {
  const embed = getVideoEmbed(memory.image_url);
  const isVideo = detectMediaType(memory.image_url) === "video";
  const isDirectVideoFile = isVideo && !embed;

  return (
    <figure className="group overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors hover:border-lilac/40">
      <div className="relative aspect-square bg-ink">
        {!isVideo ? (
          <Image
            src={memory.image_url}
            alt={resolvedTitle ?? resolvedCaption ?? "Sisterhood memory"}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
        ) : null}

        {isDirectVideoFile ? (
          <video
            src={memory.image_url}
            controls
            poster={cover ?? undefined}
            className="h-full w-full object-cover"
            aria-label={resolvedTitle ?? resolvedCaption ?? "Sisterhood memory video"}
          />
        ) : null}

        {isVideo && embed ? (
          <a
            href={memory.image_url}
            target="_blank"
            rel="noreferrer"
            className="group/play relative block h-full w-full"
          >
            {cover ? (
              <Image
                src={cover}
                alt={resolvedTitle ?? resolvedCaption ?? "Sisterhood memory video"}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover/play:scale-[1.03]"
                unoptimized
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center bg-ink/30 transition-colors group-hover/play:bg-ink/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-parchment/90 text-ink">
                <Play size={20} fill="currentColor" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-1 text-[10px] text-parchment">
              {embed.provider === "youtube" ? "Watch on YouTube" : "Watch on Vimeo"}
            </span>
          </a>
        ) : null}
      </div>

      {resolvedTitle || resolvedCaption ? (
        <figcaption className="space-y-1.5 p-5">
          {isVideo ? (
            <p className="eyebrow">
              {embed ? (embed.provider === "youtube" ? "YouTube" : "Vimeo") : "Video"}
            </p>
          ) : null}
          {resolvedTitle ? (
            <p className="font-voice text-base text-parchment">{resolvedTitle}</p>
          ) : null}
          {resolvedCaption ? (
            <p className="text-sm leading-relaxed text-muted">{resolvedCaption}</p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
