import PortalTopBar from "@/components/portal/PortalTopBar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-parchment">
      <PortalTopBar />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
