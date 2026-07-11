import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import ApplicationRow from "@/components/admin/ApplicationRow";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  member: "Membership",
  interview: "Interview",
  collab: "Collab",
};

async function getApplications(kind?: string) {
  const supabase = supabaseServer();
  let query = supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (kind && kind !== "all") {
    query = query.eq("kind", kind);
  }

  const { data } = await query;
  return data ?? [];
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind = "all" } = await searchParams;
  const applications = await getApplications(kind);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-voice text-3xl text-parchment">Applications</h1>
        <div className="flex gap-2">
          {["all", "member", "interview", "collab"].map((option) => (
            <Link
              key={option}
              href={`/admin/applications?kind=${option}`}
              className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                kind === option
                  ? "border-lilac bg-lilac text-ink"
                  : "border-muted/40 text-muted hover:border-parchment hover:text-parchment"
              }`}
            >
              {option === "all" ? "All" : KIND_LABELS[option]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {applications.length === 0 ? (
          <p className="text-sm text-muted">No applications yet.</p>
        ) : (
          applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))
        )}
      </div>
    </div>
  );
}
