"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type CheckIn = {
  id: string;
  memberName: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

function formatCheckInTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Mirrors AdminNav's own session-fetch pattern (re-fetch on pathname
 * change, no polling) rather than the React Native admin app's more
 * elaborate pub-sub + interval-polling unread-count store -- this web
 * admin panel doesn't poll anywhere else either, so a check-in showing up
 * a little later than instantly (next navigation) is consistent with how
 * "new X" already behaves here, not a regression from a fancier pattern.
 */
export default function MentorCheckInsBell() {
  const pathname = usePathname();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  async function refresh() {
    const res = await fetch("/api/admin/mentor-check-ins");
    if (!res.ok) return;
    const data = await res.json();
    setCheckIns(data.checkIns ?? []);
  }

  useEffect(() => {
    refresh();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function markRead(id: string) {
    // Optimistic -- this is a low-stakes toggle, and the PATCH below
    // reconciles with the server right after regardless.
    setCheckIns((prev) => prev.map((c) => (c.id === id ? { ...c, readAt: new Date().toISOString() } : c)));
    await fetch(`/api/admin/mentor-check-ins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
  }

  // Nothing to show for an admin_user who's never mentored anyone -- hide
  // entirely rather than showing a permanently-empty bell to every admin,
  // most of whom will never have this apply to them.
  if (checkIns.length === 0) {
    return null;
  }

  const unreadCount = checkIns.filter((c) => !c.readAt).length;

  return (
    <div className="relative">
      <button
        ref={toggleRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Mentor check-ins"
        className="relative text-sm text-muted hover:text-parchment"
      >
        Check-ins
        {unreadCount > 0 ? (
          <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-candle px-1 text-[10px] font-medium text-ink">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute right-0 z-10 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-hairline bg-surface p-3 shadow-lg"
        >
          <div className="space-y-2">
            {checkIns.map((c) => (
              <div key={c.id} className="rounded-lg border border-hairline p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-parchment">{c.memberName}</p>
                  {!c.readAt ? (
                    <button
                      onClick={() => markRead(c.id)}
                      className="shrink-0 text-[11px] text-lilac-soft hover:underline"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted">{c.message}</p>
                <p className="mt-1 text-[10px] text-muted/70">{formatCheckInTime(c.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
