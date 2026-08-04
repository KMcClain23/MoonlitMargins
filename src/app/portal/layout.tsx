import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseMemberSessionToken } from "@/lib/memberAuth";
import { hasCompletedOrientation } from "@/lib/orientationStatus";
import PortalTopBar from "@/components/portal/PortalTopBar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = parseMemberSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  // No session at all (e.g. /portal/login, /portal/setup, or the brief
  // window before middleware would otherwise have redirected) -- nothing
  // to gate against, so Contacts/Reviews just stay hidden rather than
  // querying for a member that doesn't exist.
  const orientationCompleted = session ? await hasCompletedOrientation(supabaseServer(), session.memberId) : false;

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <PortalTopBar orientationCompleted={orientationCompleted} />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
