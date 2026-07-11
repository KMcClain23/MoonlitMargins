import { supabaseServer } from "@/lib/supabase/server";
import MemoryForm from "@/components/admin/MemoryForm";
import MemoryTile from "@/components/admin/MemoryTile";

export const dynamic = "force-dynamic";

async function getMemories() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("memories")
    .select("id, image_url, thumbnail_url, caption")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminMemoriesPage() {
  const memories = await getMemories();

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Memories</h1>

      <div className="mt-6">
        <MemoryForm />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {memories.length === 0 ? (
          <p className="text-sm text-muted">No photos added yet.</p>
        ) : (
          memories.map((memory) => <MemoryTile key={memory.id} memory={memory} />)
        )}
      </div>
    </div>
  );
}
