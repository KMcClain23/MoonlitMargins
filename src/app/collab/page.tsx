import ApplicationForm, { FormField } from "@/components/ApplicationForm";
import Chapter from "@/components/Chapter";

const FIELDS: FormField[] = [
  {
    name: "websiteUrl",
    label: "Website or author page (if applicable)",
    type: "text",
  },
  {
    name: "bookTitle",
    label: "Title of the book",
    type: "text",
    required: true,
  },
  {
    name: "genre",
    label: "Genre",
    type: "text",
    required: true,
  },
  {
    name: "publicationStatus",
    label: "Is this book:",
    type: "checkbox-group",
    options: ["Published", "Upcoming release", "ARC / Advanced Reader Copy"],
  },
  {
    name: "bookDescription",
    label: "Brief description of your book (blurb or summary)",
    type: "textarea",
    required: true,
  },
  {
    name: "collabType",
    label: "What kind of collaboration are you looking for?",
    type: "checkbox-group",
    options: [
      "Book of the Month feature",
      "Group discussion / reading sprint",
      "Author interview",
      "ARC / ALC distribution to members",
      "Something else",
    ],
  },
  {
    name: "whyUs",
    label: "Why would you like the Moonlit Margins Sisterhood to read your book?",
    type: "textarea",
    required: true,
  },
  {
    name: "format",
    label: "Is your book available in:",
    type: "checkbox-group",
    required: true,
    options: ["Physical copy", "eBook", "Audiobook"],
  },
  {
    name: "participation",
    label: "Are you open to participating in:",
    type: "checkbox-group",
    required: true,
    options: ["Live discussion", "Q&A", "Social media feature"],
  },
  {
    name: "details",
    label: "Anything else you'd like us to know about your book or your vision?",
    type: "textarea",
  },
];

export default function CollabPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="starfield-subtle" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <Chapter number="three" title="Collab with us" />
        <h1 className="font-voice text-4xl text-parchment">
          Bring your book to the sisterhood.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          We work directly with authors to feature, discuss, and champion books
          with our members. Tell us about the project and how you&rsquo;d like
          to collaborate.
        </p>

        <div className="mt-12">
          <ApplicationForm kind="collab" fields={FIELDS} />
        </div>
      </div>
    </section>
  );
}
