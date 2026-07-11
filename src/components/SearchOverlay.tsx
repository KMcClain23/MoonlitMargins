"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type SearchResult = {
  type: "page" | "event" | "member";
  title: string;
  snippet: string;
  href: string;
};

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  page: "Page",
  event: "Event",
  member: "Sisterhood",
};

export default function SearchOverlay() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K opens search from anywhere on the site, matching the
  // convention most people already know from other tools.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-parchment"
      >
        <Search size={18} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/80 px-4 pt-24 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-hairline bg-surface shadow-xl">
            <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <Search size={18} className="text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, sisters, pages…"
                className="w-full bg-transparent text-sm text-parchment placeholder:text-muted/60 focus:outline-none"
              />
              <button onClick={() => setOpen(false)} aria-label="Close search" className="text-muted hover:text-parchment">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {loading ? (
                <p className="px-3 py-4 text-sm text-muted">Searching…</p>
              ) : query.trim().length < 2 ? (
                <p className="px-3 py-4 text-sm text-muted">Type at least 2 characters to search.</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted">No results for &ldquo;{query}&rdquo;.</p>
              ) : (
                results.map((result, i) => (
                  <button
                    key={`${result.type}-${result.title}-${i}`}
                    onClick={() => goTo(result.href)}
                    className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surfaceRaised"
                  >
                    <span className="eyebrow text-[10px]">{TYPE_LABELS[result.type]}</span>
                    <span className="font-voice text-sm text-parchment">{result.title}</span>
                    <span className="text-xs text-muted">{result.snippet}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
