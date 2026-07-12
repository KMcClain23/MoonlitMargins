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

  // The further zoomed in the photo is, the more of it hangs off the edges
  // of the frame -- and that overhang is exactly how much room there is to
  // pan without revealing empty background. A fixed range regardless of
  // zoom was the cause of the "cut off" bug -- at low zoom it allowed
  // panning further than any real image content existed, and at high zoom
  // it was needlessly restrictive.
  //
  // The exact formula here is 50*(z-1)/z, not the more obvious 50*(z-1) --
  // because avatarTransformStyle's translate is offsetX/100 * size * zoom
  // (scaled by zoom, so a stored offset stays a zoom-invariant relative
  // position -- see that file's comment), the safe offsetX range has to
  // divide out that same zoom factor to land back on the real pixel
  // overhang of size*(z-1)/2. Using 50*(z-1) here would let panning go
  // `zoom` times further than the image actually extends.
  function maxOffsetForZoom(z: number) {
    return z <= 1 ? 0 : (50 * (z - 1)) / z;
  }

  function clamp(n: number, z: number) {
    const max = maxOffsetForZoom(z);
    return Math.min(max, Math.max(-max, n));
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
    // The photo should visually follow the cursor -- drag right, photo
    // moves right (this was previously inverted). Divided by zoom (not
    // just PREVIEW_SIZE) to match avatarTransformStyle's zoom-scaled
    // translate, so the photo still tracks the cursor 1:1 in screen
    // pixels at any zoom level rather than drifting faster than the mouse.
    const nextOffsetX = clamp(dragStart.current.offsetX + (dx / (PREVIEW_SIZE * zoom)) * 100, zoom);
    const nextOffsetY = clamp(dragStart.current.offsetY + (dy / (PREVIEW_SIZE * zoom)) * 100, zoom);
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
        <p className="text-xs text-muted">Zoom in first, then drag the photo to reposition it.</p>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => {
              const nextZoom = Number(e.target.value);
              const max = maxOffsetForZoom(nextZoom);
              onChange({
                zoom: nextZoom,
                offsetX: Math.min(max, Math.max(-max, offsetX)),
                offsetY: Math.min(max, Math.max(-max, offsetY)),
              });
            }}
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
