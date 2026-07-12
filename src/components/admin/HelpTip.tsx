"use client";

import { useEffect, useRef, useState } from "react";

export default function HelpTip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        aria-expanded={open}
        className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-hairline text-[10px] text-muted transition-colors hover:border-lilac hover:text-lilac-soft"
      >
        ?
      </button>
      {open ? (
        <div className="absolute left-0 top-6 z-20 w-64 rounded-xl border border-hairline bg-surface p-3 text-xs leading-relaxed text-muted shadow-lg">
          {children}
        </div>
      ) : null}
    </span>
  );
}
