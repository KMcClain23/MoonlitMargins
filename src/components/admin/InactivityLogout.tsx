"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export default function InactivityLogout() {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") return;

    async function handleTimeout() {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login?reason=inactive");
      router.refresh();
    }

    function resetTimer() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(handleTimeout, INACTIVITY_LIMIT_MS);
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [pathname, router]);

  return null;
}
