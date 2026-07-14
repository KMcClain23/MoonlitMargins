"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SECTION_LABELS, type AdminSection } from "@/lib/adminSections";

const ALL_TABS: { href: string; section: AdminSection }[] = [
  { href: "/admin/applications", section: "applications" },
  { href: "/admin/events", section: "events" },
  { href: "/admin/members", section: "members" },
  { href: "/admin/memories", section: "memories" },
  { href: "/admin/tasks", section: "tasks" },
  { href: "/admin/users", section: "users" },
];

type Session = { fullName: string; role: string; sections: AdminSection[] };

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null));
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  if (pathname === "/admin/login") {
    return null;
  }

  // Only show links to sections this person actually has access to --
  // middleware already enforces this server-side, but showing a dead-end
  // link that just bounces you elsewhere isn't good nav UX.
  const tabs = ALL_TABS.filter((tab) => !session || session.sections.includes(tab.section));

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login?reason=manual");
    router.refresh();
  }

  return (
    <header className="border-b border-hairline">
      {/* Row 1: brand + account/utility links */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <span className="font-voice text-base text-parchment">
          Moonlit Margins Sisterhood <span className="text-muted">Admin</span>
        </span>

        <div className="hidden items-center gap-4 sm:flex">
          {session ? (
            <Link href="/admin/account" className="text-sm text-muted hover:text-parchment">
              {session.fullName}
            </Link>
          ) : null}
          <Link href="/" className="text-sm text-muted hover:text-parchment">
            View site ↗
          </Link>
          <button onClick={handleLogout} className="text-sm text-muted hover:text-parchment">
            Sign out
          </button>
        </div>

        <button
          ref={toggleRef}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-parchment sm:hidden"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 4h16M1 9h16M1 14h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Row 2: section tabs, underline-style active indicator */}
      <div className="hidden border-t border-hairline/60 sm:block">
        <nav className="mx-auto flex max-w-6xl gap-8 px-6">
          {tabs.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 py-3 text-sm transition-colors ${
                  active
                    ? "border-lilac text-parchment"
                    : "border-transparent text-muted hover:text-parchment"
                }`}
              >
                {SECTION_LABELS[tab.section]}
              </Link>
            );
          })}
          {/* Messages is a universal utility, not gated by section access --
              every logged-in admin user can message anyone. */}
          <Link
            href="/admin/messages"
            className={`border-b-2 py-3 text-sm transition-colors ${
              pathname?.startsWith("/admin/messages")
                ? "border-lilac text-parchment"
                : "border-transparent text-muted hover:text-parchment"
            }`}
          >
            Messages
          </Link>
        </nav>
      </div>

      {menuOpen ? (
        <div ref={menuRef} className="border-t border-hairline px-6 py-4 sm:hidden">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-2 py-2.5 text-sm transition-colors ${
                  pathname?.startsWith(tab.href)
                    ? "bg-surface text-parchment"
                    : "text-muted hover:bg-surface hover:text-parchment"
                }`}
              >
                {SECTION_LABELS[tab.section]}
              </Link>
            ))}
            <Link
              href="/admin/messages"
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-2 py-2.5 text-sm transition-colors ${
                pathname?.startsWith("/admin/messages")
                  ? "bg-surface text-parchment"
                  : "text-muted hover:bg-surface hover:text-parchment"
              }`}
            >
              Messages
            </Link>
            {session ? (
              <Link
                href="/admin/account"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-muted transition-colors hover:bg-surface hover:text-parchment"
              >
                {session.fullName} (account)
              </Link>
            ) : null}
            <div className="mt-2 flex items-center justify-between border-t border-hairline pt-3">
              <Link href="/" className="text-sm text-muted hover:text-parchment">
                View site ↗
              </Link>
              <button onClick={handleLogout} className="text-sm text-muted hover:text-parchment">
                Sign out
              </button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
