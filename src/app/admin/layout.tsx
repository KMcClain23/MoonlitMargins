import AdminNav from "@/components/admin/AdminNav";
import InactivityLogout from "@/components/admin/InactivityLogout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-parchment">
      <InactivityLogout />
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
