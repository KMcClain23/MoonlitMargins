import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { SESSION_COOKIE, parseSessionToken } from "@/lib/adminAuth";
import MessagesApp from "@/components/admin/MessagesApp";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const cookieStore = await cookies();
  const session = parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const supabase = supabaseServer();
  const { data: adminUsers } = await supabase
    .from("admin_users")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Messages</h1>
      <MessagesApp
        currentUserId={session?.adminUserId ?? ""}
        adminUsers={(adminUsers ?? []).filter((u) => u.id !== session?.adminUserId)}
      />
    </div>
  );
}
