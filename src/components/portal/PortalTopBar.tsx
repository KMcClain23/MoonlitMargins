"use client";

import { useRouter } from "next/navigation";

export default function PortalTopBar() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  }

  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <span className="font-voice text-base text-parchment">
          Moonlit Margins Sisterhood <span className="text-muted">Portal</span>
        </span>
        <button onClick={handleLogout} className="text-sm text-muted hover:text-parchment">
          Sign out
        </button>
      </div>
    </header>
  );
}
