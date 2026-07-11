import ApplicationForm, { FormField } from "@/components/ApplicationForm";
import Chapter from "@/components/Chapter";
import Countdown from "@/components/Countdown";
import { APPLICATIONS_REOPEN_AT } from "@/lib/countdownTarget";

const FIELDS: FormField[] = [
  {
    name: "whyJoin",
    label: "Why do you want to join the sisterhood?",
    type: "textarea",
    required: true,
  },
  {
    name: "currentlyReading",
    label: "What are you currently reading?",
    type: "text",
  },
  {
    name: "favoriteGenre",
    label: "Favorite genre",
    type: "select",
    required: true,
    options: [
      "Romance",
      "Fantasy",
      "Thriller / mystery",
      "Literary fiction",
      "Contemporary",
      "Nonfiction",
      "A little of everything",
    ],
  },
  {
    name: "timeZone",
    label: "Time zone (for live events)",
    type: "text",
    required: true,
  },
];

const INTERVIEWS_BEGIN = new Date(APPLICATIONS_REOPEN_AT).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function JoinPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="starfield-subtle" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <Chapter number="one" title="Join the sisterhood" />
        <h1 className="font-voice text-4xl text-parchment">Applications are open.</h1>
        <p className="mt-2 font-voice text-lg italic text-lilac-soft">
          We&rsquo;d love to get to know you.
        </p>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
          Applications are open, but we&rsquo;ll begin interviewing and welcoming
          new sisters on {INTERVIEWS_BEGIN}. Until then, we&rsquo;re
          intentionally pouring into the incredible community we&rsquo;ve
          already built while preparing for our next chapter.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          If this community feels like the right fit for you, we encourage you
          to apply now. We&rsquo;ll be waiting for you in January. Feel free to
          share this with any woman you think would make a wonderful addition
          to our sisterhood, too.
        </p>

        <div className="mt-10">
          <Countdown target={APPLICATIONS_REOPEN_AT} title="Interviews begin in" informational />
        </div>

        <div className="mt-12">
          <ApplicationForm kind="member" fields={FIELDS} />
        </div>
      </div>
    </section>
  );
}
