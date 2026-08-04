export type AdminSection =
  | "applications"
  | "events"
  | "members"
  | "memories"
  | "tasks"
  | "users"
  | "planner"
  | "contacts"
  | "reviews"
  | "orientation";
export type AdminRole = "owner" | "admin" | "editor";

export const ALL_SECTIONS: AdminSection[] = [
  "applications",
  "events",
  "members",
  "memories",
  "tasks",
  "users",
  "planner",
  "contacts",
  "reviews",
  "orientation",
];

export const SECTION_LABELS: Record<AdminSection, string> = {
  applications: "Applications",
  events: "Events",
  members: "Members",
  memories: "Memories",
  tasks: "Tasks",
  users: "Users",
  planner: "Planner",
  contacts: "Contacts",
  reviews: "Reviews",
  orientation: "Orientation",
};

// What each role can see by default. A member's allowed_sections column
// overrides this entirely when set (not merged with it) -- it's meant for
// cases where someone needs a custom set that doesn't match any role's
// defaults, e.g. an editor who should ALSO see Applications but nothing
// else new.
//
// "planner" is deliberately absent from every role here, including owner --
// unlike every other section, it's never granted automatically to anyone.
// It's an internal scheduling tool for a small subset of admins, granted
// per-admin_user via the Users management UI's allowed_sections override,
// the same mechanism editor-plus-Applications uses above.
//
// "contacts"/"reviews"/"orientation" follow the same rule, for the same
// reason: nobody (including the owner) gets them automatically. They gate
// the mobile app's member-portal screens -- an admin's OWN Contacts/
// Reviews/Orientation, reachable only when their admin_users row is also
// linked to a member row (see /api/admin/auth/token-login's bridge token
// and memberAuth.ts's memberSessionHasAdminSection). The owner grants these
// per-admin here, same as every other section.
export const ROLE_DEFAULT_SECTIONS: Record<AdminRole, AdminSection[]> = {
  owner: ["applications", "events", "members", "memories", "tasks", "users"],
  admin: ["applications", "events", "members", "memories", "tasks"],
  editor: ["events", "memories", "tasks"],
};

export function sectionsForRole(role: AdminRole, override: string[] | null | undefined): AdminSection[] {
  if (override && override.length > 0) {
    return override.filter((s): s is AdminSection => (ALL_SECTIONS as string[]).includes(s));
  }
  return ROLE_DEFAULT_SECTIONS[role];
}

// Maps a request path (/admin/events/..., /api/admin/events/...) to the
// section it belongs to, for permission checks in middleware. Returns null
// for paths that aren't section-specific (e.g. /admin/login, /admin/account).
export function sectionForPath(pathname: string): AdminSection | null {
  const match = pathname.match(/^\/(?:api\/)?admin\/([a-z]+)/);
  const segment = match?.[1];
  if (segment && (ALL_SECTIONS as string[]).includes(segment)) {
    return segment as AdminSection;
  }
  return null;
}
