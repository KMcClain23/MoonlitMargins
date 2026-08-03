import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import OrientationStepForm from "@/components/admin/OrientationStepForm";
import OrientationStepsList from "@/components/admin/OrientationStepsList";

export const dynamic = "force-dynamic";

export default async function AdminOrientationStepsPage() {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  // "orientation-steps" isn't a section in adminSections.ts, so middleware
  // doesn't gate this page at all -- same owner-only restriction as the API
  // routes, enforced here too so a non-owner admin who navigates here
  // directly gets bounced instead of landing on a page whose every action
  // would just 403.
  if (session?.role !== "owner") {
    redirect("/admin/applications");
  }

  const supabase = supabaseServer();
  const { data: steps } = await supabase
    .from("orientation_steps")
    .select("id, title, description, sort_order")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Orientation steps</h1>
      <p className="mt-1 text-sm text-muted">
        Shown to every member in the portal checklist, in this order, until they&rsquo;ve checked off all
        of them.
      </p>

      <div className="mt-6">
        <OrientationStepForm />
      </div>

      <div className="mt-8">
        <OrientationStepsList steps={steps ?? []} />
      </div>
    </div>
  );
}
