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

  // Tracks the live zoom/offset during any in-progress interaction (pan
  // drag or zoom slider) without touching React state, so the image updates
  // via direct DOM writes on every pointermove/input (smooth, no re-render)
  // instead of re-rendering the whole form on every tick -- both fire
  // dozens of times a second, and a full React re-render per event is what
  // was causing the jankiness. React state (via onChange) is only updated
  // once, when the interaction ends. The zoom slider used to call onChange
  // directly on every tick (React normalizes range-input onChange to fire
  // continuously while dragging, like the native `input` event, not just
  // once on release) -- that was re-rendering the entire form on every
  // notch of the slider and was the main source of the reported jank.
  const live = useRef({ zoom, offsetX, offsetY });

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

  function applyLiveTransform(nextZoom: number, nextOffsetX: number, nextOffsetY: number) {
    live.current = { zoom: nextZoom, offsetX: nextOffsetX, offsetY: nextOffsetY };
    if (imgRef.current) {
      const { width, height, transform } = avatarTransformStyle(nextZoom, nextOffsetX, nextOffsetY, PREVIEW_SIZE);
      imgRef.current.style.width = width;
      imgRef.current.style.height = height;
      imgRef.current.style.transform = transform;
    }
  }

  function commitLive() {
    onChange(live.current);
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    live.current = { zoom, offsetX, offsetY };
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
    applyLiveTransform(zoom, nextOffsetX, nextOffsetY);
  }

  function handlePointerUp() {
    if (dragging) commitLive();
    setDragging(false);
    dragStart.current = null;
  }

  // Seeds `live` with the latest committed values at the start of a zoom
  // interaction (mouse press or keyboard focus), the same way handlePointerDown
  // does for panning -- otherwise a stale ref from a previous gesture could
  // leak into this one.
  function handleZoomInteractionStart() {
    live.current = { zoom, offsetX, offsetY };
  }

  function handleZoomInput(e: React.FormEvent<HTMLInputElement>) {
    const nextZoom = Number(e.currentTarget.value);
    const nextOffsetX = clamp(live.current.offsetX, nextZoom);
    const nextOffsetY = clamp(live.current.offsetY, nextZoom);
    applyLiveTransform(nextZoom, nextOffsetX, nextOffsetY);
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
            // Uncontrolled (defaultValue, not value) so dragging the thumb
            // doesn't fight a React re-render mid-gesture. Keyed on the last
            // *committed* zoom so the slider still snaps to the right spot
            // after a commit (drag release, Reset button, or switching
            // photos), without React fighting the live DOM value while a
            // gesture is in progress.
            key={zoom}
            type="range"
            min={1}
            max={3}
            step={0.05}
            defaultValue={zoom}
            onPointerDown={handleZoomInteractionStart}
            onFocus={handleZoomInteractionStart}
            onInput={handleZoomInput}
            onPointerUp={commitLive}
            onKeyUp={commitLive}
            onBlur={commitLive}
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
