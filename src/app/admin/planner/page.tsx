import { cookies } from "next/headers";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import PlannerBoard from "@/components/admin/PlannerBoard";

export const dynamic = "force-dynamic";

export default async function AdminPlannerPage() {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Planner</h1>

      <div className="mt-6">
        <PlannerBoard
          currentUser={
            session
              ? {
                  adminUserId: session.adminUserId,
                  role: session.role,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
