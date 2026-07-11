import { forwardRef } from "react";

// Renders an avatar image with a stored zoom + pan applied. Used both on the
// public sisterhood page and inside the admin photo positioner, so the
// editor preview always matches what visitors actually see.
//
// Plain <img> rather than the next/image component: the zoom/pan transform
// needs direct control over the image box's width/height/transform, which
// doesn't play well with next/image's `fill` mode. The src is still routed
// through Next's built-in image optimizer manually (see optimizedSrc below)
// so this isn't giving up server-side resampling, just the <Image>
// component's own layout/fill behavior.

// Requests a properly server-side-resampled version via Next's built-in
// image optimizer, instead of handing the browser a raw (often multi-
// megapixel) original to squeeze down via CSS alone. That's what was
// causing the blurry/grainy look -- a single huge browser-side scale-down,
// especially under a CSS transform, resamples much worse than letting
// Next's optimizer downsize it properly first.
function optimizedSrc(src: string, width: number) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=85`;
}

// Shared with PhotoPositioner, which writes these same values directly to
// the DOM during a drag (bypassing React) for a smooth 60fps feel, then
// only commits to React state once the drag ends. Keeping the math in one
// place means the live-drag visual and the "settled" render always agree.
export function avatarTransformStyle(zoom: number, offsetX: number, offsetY: number, size: number) {
  // Scaled by zoom so a stored offset always represents the same relative
  // position on the image, regardless of the current zoom level. Without
  // this, the pan is a fixed pixel shift -- at higher zoom that same shift
  // is a shrinking fraction of the now-larger image, so zooming in (without
  // re-dragging) drifts the crop back toward the image's raw geometric
  // center instead of staying on whatever was panned into view.
  const translateX = (offsetX / 100) * size * zoom;
  const translateY = (offsetY / 100) * size * zoom;
  return {
    width: `${100 * zoom}%`,
    height: `${100 * zoom}%`,
    transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px)`,
  };
}

const MemberAvatarImage = forwardRef<
  HTMLImageElement,
  {
    src: string;
    alt: string;
    size: number;
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
    className?: string;
  }
>(function MemberAvatarImage({ src, alt, size, zoom = 1, offsetX = 0, offsetY = 0, className }, ref) {
  const { width, height, transform } = avatarTransformStyle(zoom, offsetX, offsetY, size);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={optimizedSrc(src, 384)}
        alt={alt}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width,
          height,
          objectFit: "cover",
          transform,
        }}
      />
    </div>
  );
});

export default MemberAvatarImage;
