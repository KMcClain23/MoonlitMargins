import ApplicationForm, { FormField } from "@/components/ApplicationForm";
import Chapter from "@/components/Chapter";

const FIELDS: FormField[] = [
  {
    name: "role",
    label: "Are you an author or a narrator?",
    type: "select",
    required: true,
    options: ["Author", "Narrator", "Both"],
  },
  {
    name: "workTitle",
    label: "Book or audiobook you'd like to talk about",
    type: "text",
    required: true,
  },
  {
    name: "pitch",
    label: "What would you want the sisterhood to know?",
    type: "textarea",
    required: true,
  },
  {
    name: "links",
    label: "Links to your work (Amazon, Audible, website, etc.)",
    type: "textarea",
  },
];

export default function InterviewPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="starfield-subtle" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <Chapter number="two" title="Interview with us" />
        <h1 className="font-voice text-4xl text-parchment">
          Let&rsquo;s talk about your work.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          We regularly feature and interview the narrators and authors behind
          the books we read. Tell us about your work and we&rsquo;ll follow up
          about scheduling a conversation.
        </p>

        <div className="mt-12">
          <ApplicationForm kind="interview" fields={FIELDS} />
        </div>
      </div>
    </section>
  );
}
