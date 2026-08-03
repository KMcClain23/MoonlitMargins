"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Orientation isn't part of this task, but it's the one existing portal
// page (see /portal/orientation) that had no way back to it once you
// navigated away -- now that this bar is getting real nav links for
// Contacts/My Profile, leaving it as the odd one out with no link at all
// would be a stranger gap than just including it here too.
const NAV_LINKS = [
  { href: "/portal/orientation", label: "Orientation" },
  { href: "/portal/contacts", label: "Contacts" },
  { href: "/portal/reviews", label: "Reviews" },
  { href: "/portal/profile", label: "My Profile" },
];

export default function PortalTopBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <span className="font-voice text-base text-parchment">
          Moonlit Margins Sisterhood <span className="text-muted">Portal</span>
        </span>

        <nav className="flex items-center gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname?.startsWith(link.href) ? "text-parchment" : "text-muted hover:text-parchment"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="text-sm text-muted hover:text-parchment">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
