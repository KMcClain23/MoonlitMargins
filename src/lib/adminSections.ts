export type AdminSection = "applications" | "events" | "members" | "memories" | "tasks" | "users";
export type AdminRole = "owner" | "admin" | "editor";

export const ALL_SECTIONS: AdminSection[] = [
  "applications",
  "events",
  "members",
  "memories",
  "tasks",
  "users",
];

export const SECTION_LABELS: Record<AdminSection, string> = {
  applications: "Applications",
  events: "Events",
  members: "Members",
  memories: "Memories",
  tasks: "Tasks",
  users: "Users",
};

// What each role can see by default. A member's allowed_sections column
// overrides this entirely when set (not merged with it) -- it's meant for
// cases where someone needs a custom set that doesn't match any role's
// defaults, e.g. an editor who should ALSO see Applications but nothing
// else new.
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
