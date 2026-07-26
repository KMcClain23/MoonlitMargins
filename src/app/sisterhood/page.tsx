import type { Metadata } from "next";
import { LinkButton } from "@/components/Button";
import Chapter from "@/components/Chapter";
import MarginNote from "@/components/MarginNote";
import BookStackMotif from "@/components/icons/BookStackMotif";
import MemberAvatarImage from "@/components/MemberAvatarImage";
import { supabaseServer } from "@/lib/supabase/server";
import { SOCIAL_PLATFORMS, buildSocialUrl, type SocialsMap } from "@/lib/socials";
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

const TITLE = "Meet the Sisterhood";
const DESCRIPTION =
  "Meet the women of The Moonlit Margins Sisterhood: a community built on belonging, author interviews, and real connection that goes beyond the book club.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/sisterhood" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/sisterhood"),
    siteName: SITE_NAME,
    type: "website",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

type Member = {
  id: string;
  full_name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  photo_zoom: number;
  photo_offset_x: number;
  photo_offset_y: number;
  socials: SocialsMap | null;
  tier: "founder" | "council" | "junior_council" | "member";
};

async function getMembers(): Promise<Member[]> {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("members")
    .select("id, full_name, role, bio, photo_url, photo_zoom, photo_offset_x, photo_offset_y, socials, tier")
    .order("display_order", { ascending: true });
  return data ?? [];
}

export default async function SisterhoodPage() {
  const members = await getMembers();

  const founders = members.filter((m) => m.tier === "founder");
  const council = members.filter((m) => m.tier === "council");
  const juniorCouncil = members.filter((m) => m.tier === "junior_council");
  const everyoneElse = members.filter((m) => m.tier === "member");

  return (
    <>
      {/* Starfield hero */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="starfield" aria-hidden="true" />
        <BookStackMotif className="pointer-events-none absolute bottom-0 left-0 hidden h-56 w-36 lg:block" />
        <BookStackMotif className="pointer-events-none absolute bottom-0 right-0 hidden h-56 w-36 lg:block" flip />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="eyebrow mb-4">The women between the pages</p>
          <h1 className="font-voice text-4xl text-parchment sm:text-5xl">
            This is the sisterhood.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted">
            A constellation of diverse, hardworking women in our online
            reading community, bound by a passion for stories and for life
            itself. Here you&rsquo;ll find women who lift one another, who
            laugh and cry together, and who always have each other&rsquo;s
            backs, proving that when we share stories, we don&rsquo;t just
            turn pages, we live them side by side.
          </p>
        </div>
      </section>

      {/* Founders */}
      {founders.length > 0 ? (
        <section className="border-b border-hairline">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Chapter number="one" title="Where it started" as="h2" />
            <div className="grid gap-6 sm:grid-cols-2">
              {founders.map((founder) => (
                <FounderCard key={founder.id} member={founder} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Leadership council */}
      {council.length > 0 ? (
        <section className="border-b border-hairline bg-surface/40">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Chapter number="two" title="The leadership council" as="h2" />
            <p className="max-w-lg text-sm text-muted">
              The women who keep the sisterhood running week to week, from
              events to the community itself.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {council.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Junior council */}
      {juniorCouncil.length > 0 ? (
        <section className="border-b border-hairline">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Chapter number="three" title="The junior council" as="h2" />
            <p className="max-w-lg text-sm text-muted">
              Rising leaders learning the ropes of running the sisterhood,
              working alongside the council on events and community.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {juniorCouncil.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Moonlit Council / general members */}
      {everyoneElse.length > 0 ? (
        <section>
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Chapter number="four" title="The members" as="h2" />
            <div className="grid gap-8 sm:grid-cols-2">
              <p className="max-w-md text-sm leading-relaxed text-muted">
                The wider circle of sisters who make this a community instead
                of a club, showing up for events, discussions, and each
                other, month after month.
              </p>
              <MarginNote attribution="a note from the group chat">
                We don&rsquo;t just turn pages. We live them side by side.
              </MarginNote>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {everyoneElse.map((member) => (
                <MemberCard key={member.id} member={member} compact />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {members.length === 0 ? (
        <section className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-sm text-muted">
            Leadership profiles are being added. Check back soon.
          </p>
        </section>
      ) : null}

      {/* Beyond a book club / author interviews / active social presence --
          three ideas Kaya wanted the site's own copy to reflect, written
          fresh in this page's own voice rather than as a bullet list. */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Chapter number="five" title="More than a book club" as="h2" />
          <div className="max-w-2xl space-y-5 text-sm leading-relaxed text-muted">
            <p>
              We didn&rsquo;t build this to be another place to log what you&rsquo;re
              reading. It&rsquo;s a home for belonging, for the kind of creativity
              and confidence that comes from being fully seen by women who get
              it. A shared book is just the excuse to show up for each other.
            </p>
            <p>
              That same spirit spills into the stories themselves. We regularly
              sit down with the authors and narrators behind the books we love
              for live interviews and spotlight conversations, pulling back the
              curtain on the people who make our reading life what it is.
            </p>
            <p>
              And the sisterhood doesn&rsquo;t live only here. Find us swapping
              recommendations and behind-the-scenes moments on TikTok,
              Instagram, and Facebook, alongside everything on this site. A
              community this alive was never going to fit in just one place.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-hairline bg-surface/40">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="font-voice text-2xl text-parchment">Ready to pull up a chair?</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Applications to join our virtual book club are open.
          </p>
          <div className="mt-6">
            <LinkButton href="/join">Join the sisterhood</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}

function FounderCard({ member }: { member: Member }) {
  return (
    <div className="rounded-2xl border border-lilac/30 bg-surface p-7 transition-colors hover:border-lilac/50">
      <div className="flex items-center gap-4">
        <Avatar member={member} size={72} />
        <div>
          <p className="font-voice text-xl text-parchment">{member.full_name}</p>
          {member.role ? <p className="text-sm text-lilac-soft">{member.role}</p> : null}
          <SocialIcons socials={member.socials} />
        </div>
      </div>
      {member.bio ? (
        <p className="mt-5 text-sm leading-relaxed text-muted">{member.bio}</p>
      ) : null}
    </div>
  );
}

function MemberCard({ member, compact }: { member: Member; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-surface p-5 text-center transition-colors hover:border-lilac/40 hover:bg-surfaceRaised">
        <Avatar member={member} size={72} />
        <p className="mt-2 font-voice text-base text-parchment">{member.full_name}</p>
        {member.role ? <p className="text-xs text-lilac-soft">{member.role}</p> : null}
        <SocialIcons socials={member.socials} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6 transition-colors hover:border-lilac/40">
      <div className="flex items-center gap-4">
        <Avatar member={member} size={56} />
        <div>
          <p className="font-voice text-lg text-parchment">{member.full_name}</p>
          {member.role ? <p className="text-xs text-lilac-soft">{member.role}</p> : null}
          <SocialIcons socials={member.socials} />
        </div>
      </div>
      {member.bio ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{member.bio}</p>
      ) : null}
    </div>
  );
}

function SocialIcons({ socials }: { socials: SocialsMap | null }) {
  if (!socials) return null;
  const links = SOCIAL_PLATFORMS.map((platform) => {
    const value = socials[platform.key];
    const url = value ? buildSocialUrl(platform.base, value) : null;
    return url ? { ...platform, url } : null;
  }).filter((entry): entry is (typeof SOCIAL_PLATFORMS)[number] & { url: string } => entry !== null);

  if (links.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-2.5">
      {links.map(({ key, label, Icon, url }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="text-muted transition-colors hover:text-lilac-soft"
        >
          <Icon size={14} />
        </a>
      ))}
    </div>
  );
}

function Avatar({ member, size }: { member: Member; size: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-surfaceRaised"
      style={{ width: size, height: size }}
    >
      {member.photo_url ? (
        <MemberAvatarImage
          src={member.photo_url}
          alt={member.full_name}
          size={size}
          zoom={member.photo_zoom}
          offsetX={member.photo_offset_x}
          offsetY={member.photo_offset_y}
        />
      ) : null}
    </div>
  );
}
