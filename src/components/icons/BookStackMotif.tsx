/**
 * A simple stacked-books silhouette, used as a low-opacity decorative
 * flourish in hero sections. Original flat vector art matching the site's
 * design system, not a reproduction of any photo or illustration.
 */
export default function BookStackMotif({
  className,
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 160 200"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
    >
      <rect x="10" y="150" width="140" height="24" rx="3" fill="#E8973D" opacity="0.18" />
      <rect x="18" y="122" width="124" height="24" rx="3" fill="#E8973D" opacity="0.16" />
      <rect x="26" y="94" width="108" height="24" rx="3" fill="#E8973D" opacity="0.14" />
      <rect x="34" y="66" width="92" height="24" rx="3" fill="#E8973D" opacity="0.12" />
      {/* A single upright book leaning against the stack */}
      <rect
        x="118"
        y="40"
        width="22"
        height="110"
        rx="2"
        fill="#D9662E"
        opacity="0.14"
        transform="rotate(8 129 95)"
      />
    </svg>
  );
}
