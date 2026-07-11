"use client";

import { useRef, useState } from "react";
import MemberAvatarImage, { avatarTransformStyle } from "@/components/MemberAvatarImage";

const PREVIEW_SIZE = 160;

export default function PhotoPositioner({
  imageUrl,
  zoom,
  offsetX,
  offsetY,
  onChange,
}: {
  imageUrl: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  onChange: (next: { zoom: number; offsetX: number; offsetY: number }) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  // Tracks the live offset during a drag without touching React state, so
  // the image moves via direct DOM writes on every pointermove (smooth,
  // no re-render) instead of re-rendering the whole form on every pixel of
  // movement -- pointer events fire dozens of times a second, and a full
  // React re-render per event is what was causing the jankiness. React
  // state (via onChange) is only updated once, when the drag ends.
  const liveOffset = useRef({ offsetX, offsetY });

  function clamp(n: number) {
    return Math.min(50, Math.max(-50, n));
  }

  function applyLiveTransform(nextOffsetX: number, nextOffsetY: number) {
    liveOffset.current = { offsetX: nextOffsetX, offsetY: nextOffsetY };
    if (imgRef.current) {
      const { width, height, transform } = avatarTransformStyle(zoom, nextOffsetX, nextOffsetY, PREVIEW_SIZE);
      imgRef.current.style.width = width;
      imgRef.current.style.height = height;
      imgRef.current.style.transform = transform;
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offsetX, offsetY };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Divide by zoom too, so the image keeps tracking the cursor 1:1 in
    // screen pixels no matter the current zoom level (matches
    // avatarTransformStyle's zoom-scaled translate -- see its comment).
    const nextOffsetX = clamp(dragStart.current.offsetX - (dx / (PREVIEW_SIZE * zoom)) * 100);
    const nextOffsetY = clamp(dragStart.current.offsetY - (dy / (PREVIEW_SIZE * zoom)) * 100);
    applyLiveTransform(nextOffsetX, nextOffsetY);
  }

  function handlePointerUp() {
    if (dragging) {
      onChange({ zoom, offsetX: liveOffset.current.offsetX, offsetY: liveOffset.current.offsetY });
    }
    setDragging(false);
    dragStart.current = null;
  }

  return (
    <div className="flex items-start gap-4">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`rounded-full ring-1 ring-hairline ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "none" }}
      >
        <MemberAvatarImage
          ref={imgRef}
          src={imageUrl}
          alt=""
          size={PREVIEW_SIZE}
          zoom={zoom}
          offsetX={offsetX}
          offsetY={offsetY}
          className="rounded-full select-none"
        />
      </div>

      <div className="flex-1 space-y-3 pt-1">
        <p className="text-xs text-muted">Drag the photo to reposition it, then use the slider to zoom.</p>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => onChange({ zoom: Number(e.target.value), offsetX, offsetY })}
            className="w-full accent-lilac"
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ zoom: 1, offsetX: 0, offsetY: 0 })}
          className="text-xs text-lilac-soft hover:underline"
        >
          Reset positioning
        </button>
      </div>
    </div>
  );
}
