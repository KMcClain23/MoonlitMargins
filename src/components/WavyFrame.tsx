"use client";

import { useId } from "react";

/**
 * Wraps an image (or anything) in a soft, hand-cut-feeling frame instead of
 * a plain rectangle or uniformly rounded corners -- each corner is angled
 * (chamfered) rather than either sharp or circular, and each edge has a
 * gentle wave rather than being perfectly straight. Meant for photos/
 * illustrations that otherwise look too stiff/geometric against the site's
 * softer, hand-drawn visual language (margin notes, flourishes, etc.).
 *
 * Uses objectBoundingBox coordinates so the same path definition scales
 * automatically to whatever size the wrapped element actually renders at,
 * rather than needing a fixed pixel size.
 */
export default function WavyFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const clipId = useId().replace(/:/g, "");

  return (
    <div className={className} style={{ clipPath: `url(#${clipId})` }}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path
              d="
                M 0.09,0
                C 0.28,0.015 0.38,-0.012 0.5,0
                C 0.62,0.012 0.72,-0.015 0.91,0
                L 1,0.09
                C 0.985,0.28 1.012,0.38 1,0.5
                C 0.988,0.62 1.015,0.72 1,0.91
                L 0.91,1
                C 0.72,0.985 0.62,1.012 0.5,1
                C 0.38,0.988 0.28,1.015 0.09,1
                L 0,0.91
                C 0.015,0.72 -0.012,0.62 0,0.5
                C 0.012,0.38 -0.015,0.28 0,0.09
                Z
              "
            />
          </clipPath>
        </defs>
      </svg>
      {children}
    </div>
  );
}
