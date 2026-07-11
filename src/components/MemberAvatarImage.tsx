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

export default function MemberAvatarImage({
  src,
  alt,
  size,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
  className,
}: {
  src: string;
  alt: string;
  size: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  className?: string;
}) {
  const translateX = (offsetX / 100) * size;
  const translateY = (offsetY / 100) * size;

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={optimizedSrc(src, 384)}
        alt={alt}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${100 * zoom}%`,
          height: `${100 * zoom}%`,
          objectFit: "cover",
          transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px)`,
        }}
      />
    </div>
  );
}
