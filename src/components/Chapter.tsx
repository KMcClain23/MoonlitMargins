/**
 * The site's content is organized like chapters in a shared book —
 * this label reflects that literally, rather than using a generic
 * numbered-step convention. Only used where sections genuinely read
 * top to bottom as a sequence (the homepage narrative).
 *
 * Renders as a plain <p> by default (its original behavior, unchanged
 * for every existing call site). Pass `as="h2"` only where this is the
 * real subheading for that section AND it's guaranteed to come after
 * the page's own <h1> in document order -- on join/partner/events/
 * memories, Chapter is placed just *before* the page's h1, where
 * promoting it to a heading would put an h2 ahead of the h1 in the
 * page's outline. Same visual style either way; only the semantic tag
 * changes.
 */
export default function Chapter({
  number,
  title,
  as = "p",
}: {
  number: string;
  title: string;
  as?: "p" | "h2";
}) {
  const Tag = as;
  return (
    <Tag className="eyebrow mb-4">
      Chapter {number}: {title}
    </Tag>
  );
}
