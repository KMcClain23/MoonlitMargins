import { LinkButton } from "@/components/Button";
import Chapter from "@/components/Chapter";
import MarginNote from "@/components/MarginNote";
import Countdown from "@/components/Countdown";
import BookStackMotif from "@/components/icons/BookStackMotif";
import SocialLinks from "@/components/SocialLinks";
import Parallax from "@/components/Parallax";
import { APPLICATIONS_REOPEN_AT } from "@/lib/countdownTarget";

const INTERVIEWS_BEGIN = new Date(APPLICATIONS_REOPEN_AT).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const PERKS = [
  {
    title: "Book of the month",
    body: "Vote on a shared read and dig into it together, plus endless discussion on whatever else you're reading.",
  },
  {
    title: "A welcome swag box",
    body: "The moment you join, a curated box of Moonlit Margins Sisterhood goodies lands on your doorstep.",
  },
  {
    title: "Monthly rewards",
    body: "Take part in monthly challenges to earn rewards, including a free book.",
  },
  {
    title: "ARC and ALC access",
    body: "Early access to advance reader and listener copies through our author and narrator partners.",
  },
  {
    title: "Author and narrator partnerships",
    body: "Direct interviews and partnerships with the authors and narrators behind the books we love.",
  },
  {
    title: "Meetups, big and small",
    body: "One weekend a year, the whole sisterhood gathers somewhere in the U.S. Beyond that, link up with sisters near you at local book signings and author events.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-moon-glow">
        <div className="starfield" aria-hidden="true" />
        <Parallax
          speed={0.15}
          className="pointer-events-none absolute bottom-0 left-0 hidden h-64 w-40 lg:block"
        >
          <BookStackMotif className="h-full w-full" />
        </Parallax>
        <Parallax
          speed={-0.15}
          className="pointer-events-none absolute bottom-0 right-0 hidden h-64 w-40 lg:block"
        >
          <BookStackMotif className="h-full w-full" flip />
        </Parallax>
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <p className="eyebrow mb-6">est. a sisterhood of readers</p>
          <h1 className="font-voice text-4xl leading-tight text-parchment sm:text-5xl md:text-6xl">
            More than a book club.
            <br />A home for your reading life.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg">
            The Moonlit Margins Sisterhood connects readers across the country
            through stories, real conversation, and showing up for each other
            the way we show up for the books we love.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LinkButton href="/join">Apply to join</LinkButton>
            <LinkButton href="/sisterhood" variant="secondary">
              Meet the sisterhood
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Applications open + informational countdown to interviews beginning */}
      <section className="border-t border-hairline bg-surface/40">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="font-voice text-2xl text-parchment">Applications are open.</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            We&rsquo;d love to get to know you. We&rsquo;ll begin interviewing
            and welcoming new sisters on {INTERVIEWS_BEGIN}. Until then,
            we&rsquo;re pouring into the community we&rsquo;ve already built.
            If this feels like the right fit, go ahead and apply. We&rsquo;ll
            be waiting for you in January.
          </p>

          <div className="mt-10">
            <Countdown target={APPLICATIONS_REOPEN_AT} title="Interviews begin in" informational />
          </div>

          <div className="mt-10">
            <LinkButton href="/join">Apply to join</LinkButton>
          </div>
        </div>
      </section>

      {/* Welcome letter */}
      <section className="border-t border-hairline">
        <Parallax speed={0.08} className="mx-auto grid max-w-5xl gap-10 px-6 py-24 md:grid-cols-[1fr_2fr]">
          <div>
            <Chapter number="one" title="Welcome" />
          </div>
          <div className="max-w-prose">
            <p className="font-voice text-2xl italic text-lilac-soft">
              Dearest reader,
            </p>
            <p className="mt-6 text-base leading-relaxed text-parchment/90">
              We aren&rsquo;t here for surface-level talk or passing trends.
              Moonlit Margins Sisterhood started as a handful of women who wanted a book
              club that actually meant something, a place to talk about the
              stories that stay with you, and the people going through life
              alongside you. It grew into a sisterhood with members across
              the country, a shared Book of the Month, live reading sprints,
              and a yearly weekend where we finally meet face to face.
            </p>
            <p className="mt-6 text-base leading-relaxed text-parchment/90">
              If you&rsquo;re looking for a club that shows up with the same
              presence you give the books you love, we saved you a seat in
              the margin.
            </p>
            <div className="mt-10">
              <MarginNote attribution="Kaya R., Founder">
                We built the sisterhood we wished existed. Now it&rsquo;s yours too.
              </MarginNote>
            </div>
          </div>
        </Parallax>
      </section>

      {/* Membership perks */}
      <section className="border-t border-hairline bg-surface/40">
        <Parallax speed={0.08} className="mx-auto max-w-5xl px-6 py-24">
          <Chapter number="two" title="What membership looks like" />
          <h2 className="font-voice text-3xl text-parchment sm:text-4xl">
            Everything that comes with pulling up a chair.
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((perk) => (
              <div
                key={perk.title}
                className="rounded-2xl border border-hairline bg-surface p-6"
              >
                <p className="font-voice text-lg text-lilac-soft">{perk.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{perk.body}</p>
              </div>
            ))}
          </div>
        </Parallax>
      </section>

      {/* Three paths */}
      <section className="border-t border-hairline">
        <Parallax speed={0.08} className="mx-auto max-w-5xl px-6 py-24">
          <Chapter number="three" title="Find your way in" />
          <div className="grid gap-6 md:grid-cols-3">
            <PathCard
              href="/join"
              title="Join the sisterhood"
              body="For readers ready to become a member and take part in everything the club offers."
            />
            <PathCard
              href="/partner?type=interview"
              title="Interview with us"
              body="For narrators and authors who want to be featured and interviewed by the sisterhood."
            />
            <PathCard
              href="/partner?type=collab"
              title="Partner with us"
              body="For authors who want their book read, discussed, and featured with the club."
            />
          </div>
        </Parallax>
      </section>

      {/* Socials */}
      <section className="border-t border-hairline bg-surface/40">
        <Parallax speed={0.08} className="mx-auto max-w-4xl px-6 py-24 text-center">
          <Chapter number="four" title="Keep in touch" />
          <h2 className="font-voice text-3xl italic text-parchment sm:text-4xl">
            Find us where the moonlight lingers&hellip;
          </h2>
          <div className="mt-8">
            <SocialLinks />
          </div>
        </Parallax>
      </section>
    </>
  );
}

function PathCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-hairline p-7 transition-colors hover:border-lilac/60"
    >
      <p className="font-voice text-xl text-parchment">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
      <span className="mt-5 inline-block text-sm text-lilac-soft transition-transform group-hover:translate-x-1">
        Learn more →
      </span>
    </a>
  );
}
