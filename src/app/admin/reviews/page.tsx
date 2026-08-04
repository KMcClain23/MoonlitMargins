import PortalReviewsView from "@/components/portal/PortalReviewsView";

export const dynamic = "force-dynamic";

// Thin wrapper around the exact same component the real member portal uses
// at /portal/reviews -- see /admin/contacts/page.tsx's doc comment for why
// this works with no page-specific logic (the admin-linked-member bridge
// cookie set by /api/admin/login).
export default function AdminReviewsPage() {
  return <PortalReviewsView />;
}
