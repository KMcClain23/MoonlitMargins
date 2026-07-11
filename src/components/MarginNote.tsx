/**
 * The signature visual device for the site: a short annotation that
 * sits like a handwritten note in the margin of a book, next to the
 * section it comments on. Ties directly to "Moonlit Margins" instead
 * of being decorative. Use sparingly — one per section, max.
 */
export default function MarginNote({
  children,
  attribution,
}: {
  children: React.ReactNode;
  attribution?: string;
}) {
  return (
    <aside className="margin-note">
      <p>&ldquo;{children}&rdquo;</p>
      {attribution ? (
        <p className="mt-2 font-body text-xs not-italic text-muted">
          {attribution}
        </p>
      ) : null}
    </aside>
  );
}
