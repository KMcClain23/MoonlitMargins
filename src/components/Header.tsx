"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MoonFlameMark from "@/components/icons/MoonFlameMark";
import SearchOverlay from "@/components/SearchOverlay";

const NAV_LINKS = [
  { href: "/sisterhood", label: "The sisterhood" },
  { href: "/events", label: "Events" },
  { href: "/memories", label: "Memories" },
  { href: "/interview", label: "Interview with us" },
  { href: "/collab", label: "Collab with us" },
];

export default function Header() {
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

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-voice text-lg tracking-wide text-parchment">
          <MoonFlameMark size={26} />
          Moonlit Margins Sisterhood
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-parchment"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SearchOverlay />
          <Link
            href="/join"
            className="hidden rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft sm:inline-block"
          >
            Apply to join
          </Link>
          <button
            ref={toggleRef}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-parchment md:hidden"
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
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
      </div>

      {menuOpen ? (
        <div ref={menuRef} className="border-t border-hairline bg-ink px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-muted transition-colors hover:bg-surface hover:text-parchment"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/join"
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-full bg-lilac px-5 py-2 text-center text-sm font-medium text-ink transition-colors hover:bg-lilac-soft sm:hidden"
            >
              Apply to join
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
