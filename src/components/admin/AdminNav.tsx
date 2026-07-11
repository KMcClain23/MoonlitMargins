"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/memories", label: "Memories" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="font-voice text-base text-parchment">
            Moonlit Margins Sisterhood <span className="text-muted">Admin</span>
          </span>
          <nav className="hidden gap-6 sm:flex">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-sm transition-colors ${
                  pathname?.startsWith(tab.href)
                    ? "text-parchment"
                    : "text-muted hover:text-parchment"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-4 sm:flex">
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

      {menuOpen ? (
        <div ref={menuRef} className="border-t border-hairline px-6 py-4 sm:hidden">
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
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
                {tab.label}
              </Link>
            ))}
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
