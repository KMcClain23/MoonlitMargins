"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Contacts and Reviews are gated behind orientationCompleted -- account
// settings (My Profile) and the checklist itself (Orientation) stay
// reachable regardless, since a member who hasn't finished orientation
// still needs a way to manage her own account and to get to the thing
// she's supposed to be finishing.
const NAV_LINKS = [
  { href: "/portal/orientation", label: "Orientation", requiresOrientationComplete: false },
  { href: "/portal/contacts", label: "Contacts", requiresOrientationComplete: true },
  { href: "/portal/reviews", label: "Reviews", requiresOrientationComplete: true },
  { href: "/portal/profile", label: "My Profile", requiresOrientationComplete: false },
];

export default function PortalTopBar({ orientationCompleted }: { orientationCompleted: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleLinks = NAV_LINKS.filter((link) => !link.requiresOrientationComplete || orientationCompleted);

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
          {visibleLinks.map((link) => (
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
