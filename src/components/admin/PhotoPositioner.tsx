"use client";

import { useRef, useState } from "react";
import MemberAvatarImage from "@/components/MemberAvatarImage";

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
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  function clamp(n: number) {
    return Math.min(50, Math.max(-50, n));
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
    // Dragging the photo right should reveal more of its left side, so the
    // stored offset moves opposite to the pointer's on-screen movement.
    const nextOffsetX = clamp(dragStart.current.offsetX - (dx / PREVIEW_SIZE) * 100);
    const nextOffsetY = clamp(dragStart.current.offsetY - (dy / PREVIEW_SIZE) * 100);
    onChange({ zoom, offsetX: nextOffsetX, offsetY: nextOffsetY });
  }

  function handlePointerUp() {
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
