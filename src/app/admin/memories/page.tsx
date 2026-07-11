import { supabaseServer } from "@/lib/supabase/server";
import MemoryForm from "@/components/admin/MemoryForm";
import MemoryTile from "@/components/admin/MemoryTile";
import { getVideoEmbed, resolveVideoPublishedAt } from "@/lib/videoEmbed";

export const dynamic = "force-dynamic";

async function getMemories() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("memories")
    .select("id, image_url, thumbnail_url, title, caption, published_at, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminMemoriesPage() {
  const memories = await getMemories();

  const autoPublishedAt = new Map<string, string | null>();
  await Promise.all(
    memories
      .filter((m) => !m.published_at && getVideoEmbed(m.image_url))
      .map(async (m) => {
        autoPublishedAt.set(m.id, await resolveVideoPublishedAt(m.image_url));
      })
  );

  const sorted = [...memories].sort((a, b) => {
    const aDate = a.published_at || autoPublishedAt.get(a.id) || a.created_at;
    const bDate = b.published_at || autoPublishedAt.get(b.id) || b.created_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Memories</h1>

      <div className="mt-6">
        <MemoryForm />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No photos added yet.</p>
        ) : (
          sorted.map((memory) => <MemoryTile key={memory.id} memory={memory} />)
        )}
      </div>
    </div>
  );
}
