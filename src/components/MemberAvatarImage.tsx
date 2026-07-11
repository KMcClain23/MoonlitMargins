// Renders an avatar image with a stored zoom + pan applied. Used both on the
// public sisterhood page and inside the admin photo positioner, so the
// editor preview always matches what visitors actually see.
//
// Plain <img> rather than next/image: the zoom/pan transform needs direct
// control over the image box's width/height/transform, which doesn't play
// well with next/image's `fill` mode. Avatars are small enough that losing
// automatic optimization here isn't a meaningful cost.

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
        src={src}
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
