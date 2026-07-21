"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps its children in an element that drifts vertically as the page
 * scrolls, at a rate relative to normal scroll speed set by `speed`:
 *   - 0 = no movement (locked to the page, same as not wrapping it)
 *   - 0 < speed < 1 = drifts slower than the page (a "background" layer,
 *     feels like it's further away)
 *   - speed < 0 = drifts in the opposite direction (a nice contrast against
 *     a positive-speed layer in the same section)
 *
 * The effect is intentionally local to each instance rather than tied to
 * total page scroll position -- it's driven by the element's own position
 * relative to the viewport, so it naturally stays contained to roughly
 * when that section is on screen instead of drifting further and further
 * as the page gets longer.
 */
export default function Parallax({
  children,
  speed = 0.2,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || speed === 0) return;

    const el = ref.current;
    if (!el) return;

    // Only listen to scroll while this element is anywhere near the
    // viewport -- most of the page's parallax layers are off-screen at
    // any given moment, so this avoids dozens of idle scroll handlers
    // doing pointless work.
    const observer = new IntersectionObserver(
      (entries) => setActive(entries[0]?.isIntersecting ?? false),
      { rootMargin: "50% 0px 50% 0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [speed]);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    let ticking = false;

    function update() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const distance = viewportCenter - elementCenter;
      setOffset(distance * speed);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [active, speed]);

  return (
    <div ref={ref} className={className} style={{ transform: `translateY(${offset}px)` }}>
      {children}
    </div>
  );
}
