/**
 * The site's content is organized like chapters in a shared book —
 * this label reflects that literally, rather than using a generic
 * numbered-step convention. Only used where sections genuinely read
 * top to bottom as a sequence (the homepage narrative).
 */
export default function Chapter({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <p className="eyebrow mb-4">
      Chapter {number}: {title}
    </p>
  );
}
