"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function Countdown({
  target,
  title = "Doors open",
  subtitle,
  openContent,
  informational = false,
}: {
  target: string;
  title?: string;
  subtitle?: string;
  /**
   * Rendered once the target time has passed, replacing the countdown.
   * Ignored when `informational` is true.
   */
  openContent?: React.ReactNode;
  /**
   * When true, the timer never hides anything -- it just ticks down as a
   * standalone widget, and freezes at 00:00:00:00 once the target passes
   * instead of swapping to openContent. Use this when applications (or
   * whatever the countdown is about) are already accessible and the timer
   * is communicating a *future* milestone, not gating current access.
   */
  informational?: boolean;
}) {
  // Start as "not yet mounted" so server and first client render match
  // exactly (avoids hydration mismatches from clock differences), then
  // compute the real countdown once mounted in the browser.
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const remaining = getTimeLeft(target);
      setTimeLeft(remaining);
      if (!informational && new Date(target).getTime() <= Date.now()) {
        setIsOpen(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target, informational]);

  if (!mounted) {
    // Render nothing on the server / before hydration to avoid a flash of
    // "0d 0h 0m 0s" -- the real countdown appears the instant JS loads.
    return null;
  }

  if (isOpen && !informational) {
    return <>{openContent}</>;
  }

  return (
    <div className="text-center">
      <p className="eyebrow mb-4">{title}</p>
      {subtitle ? <p className="mx-auto mb-8 max-w-md text-sm text-muted">{subtitle}</p> : null}
      <div className="flex justify-center gap-3 sm:gap-5">
        <TimeUnit value={timeLeft.days} label="days" />
        <TimeUnit value={timeLeft.hours} label="hours" />
        <TimeUnit value={timeLeft.minutes} label="min" />
        <TimeUnit value={timeLeft.seconds} label="sec" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex w-16 flex-col items-center rounded-2xl border border-hairline bg-surface py-4 sm:w-20">
      <span className="font-voice text-2xl text-parchment sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
