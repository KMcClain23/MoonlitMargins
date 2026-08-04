import PortalContactsView from "@/components/portal/PortalContactsView";

export const dynamic = "force-dynamic";

// Thin wrapper around the exact same component the real member portal uses
// at /portal/contacts -- reachable here because /api/admin/login (and the
// Google callback) also set a member_session cookie for any admin whose
// account is linked to a member row (see memberAuth.ts's
// mintAdminLinkedMemberSession). Section access ("contacts") and the
// "does this admin even have a linked member row" case are both already
// handled before this renders: middleware.ts redirects away without the
// section, and PortalContactsView's own fetch just comes back empty/erroring
// if there's no member_session cookie to send. No page-level session check
// needed here -- unlike /portal/contacts/page.tsx, there's no orientation
// gate to enforce for an admin using this bridge.
export default function AdminContactsPage() {
  return <PortalContactsView />;
}
