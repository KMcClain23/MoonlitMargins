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
  {
    name: "phone",
    label: "Phone",
    type: "text",
    required: true,
  },
  {
    name: "state",
    label: "What state do you currently reside in?",
    type: "text",
    required: true,
  },
  {
    name: "howHeard",
    label: "How did you hear about us?",
    type: "select",
    required: true,
    options: ["TikTok", "Instagram", "Facebook", "A friend or word of mouth", "Google search", "Other"],
  },
  {
    name: "birthday",
    label: "Birthday (year optional)",
    type: "birthday",
  },
  {
    name: "bookCrackedOpen",
    label: "What book cracked something open in you and why?",
    type: "textarea",
    required: true,
  },
  {
    name: "readerEnergy",
    label: "Describe your reader energy in 3 words",
    type: "text",
    required: true,
  },
  {
    name: "whatDrawsYou",
    label: "What draws you to the Moonlit Margins community?",
    type: "textarea",
    required: true,
  },
  {
    name: "interviewAvailability",
    label: "If invited to interview, what days/times usually work for you?",
    type: "checkbox-group",
    required: true,
    options: ["Weekday evenings", "Saturday mornings", "Saturday afternoons", "Sunday mornings", "Sunday afternoons"],
  },
  {
    name: "bookishSocials",
    label: "Drop your BookTok, Bookstagram, Goodreads, or other bookish socials (optional)",
    type: "text",
  },
  {
    name: "whisper",
    label: "Anything you'd love to whisper into the sisterhood under the stars? (optional)",
    type: "textarea",
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

        {/* DRAFT COPY -- Dean, please edit this to say exactly what you want
            new members to know before they apply. */}
        <div className="mt-10 rounded-2xl border border-hairline bg-surface p-6">
          <p className="font-voice text-lg text-parchment">What&rsquo;s required of me if I&rsquo;m accepted?</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Once accepted, we ask every sister to take part in at least one Book of the Month
            discussion each cycle, show up (virtually or in person) when you&rsquo;re able, and
            treat this community with the same care you&rsquo;d want back. Membership isn&rsquo;t a
            spectator sport &mdash; it&rsquo;s a sisterhood, and it only works if we all show up
            for it.
          </p>
        </div>

        <div className="mt-12">
          <ApplicationForm kind="member" fields={FIELDS} />
        </div>
      </div>
    </section>
  );
}
