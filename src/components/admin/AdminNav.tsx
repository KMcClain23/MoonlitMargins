"use client";

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
          <span className="font-voice text-base text-parchment">Moonlit Margins admin</span>
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
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted hover:text-parchment">
            View site ↗
          </Link>
          <button onClick={handleLogout} className="text-sm text-muted hover:text-parchment">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
