import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseMemberSessionToken } from "@/lib/memberAuth";
import { hasCompletedOrientation } from "@/lib/orientationStatus";
import PortalContactsView from "@/components/portal/PortalContactsView";

export const dynamic = "force-dynamic";

export default async function PortalContactsPage() {
  const cookieStore = await cookies();
  const session = parseMemberSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  // Middleware already guarantees a session for every /portal/* route
  // except login/setup -- this is just defense in depth.
  if (!session) {
    redirect("/portal/login");
  }

  // Defense in depth against the nav link being hidden but the route
  // still reachable directly (typed URL, old bookmark) -- Contacts is
  // gated behind finishing orientation the same way PortalTopBar hides
  // its link.
  const completed = await hasCompletedOrientation(supabaseServer(), session.memberId);
  if (!completed) {
    redirect("/portal/orientation");
  }

  return <PortalContactsView />;
}
