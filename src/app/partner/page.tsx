import type { Metadata } from "next";
import Image from "next/image";
import Chapter from "@/components/Chapter";
import PartnerForm from "@/components/PartnerForm";
import WavyFrame from "@/components/WavyFrame";
import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/seo";

// Covers both the "interview" and "collab" paths -- /interview and /collab
// are pure redirect stubs into this page (see those files), so this is the
// one real page a crawler or share link actually lands on either way.
const TITLE = "Partner With Us: Author & Narrator Interviews";
const DESCRIPTION =
  "Authors and narrators: partner with The Moonlit Margins Sisterhood for book club features, interviews, and real discussion with an engaged reading community.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/partner" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/partner"),
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

export default function PartnerPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="starfield-subtle" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-6 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <Chapter number="two" title="Interview or partner with us" />
            <h1 className="font-voice text-4xl text-parchment">
              Let&rsquo;s work together.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              We regularly feature and interview the narrators and authors behind the books we
              read, and we work directly with authors to feature, discuss, and champion their
              books with our members. Choose whichever fits below.
            </p>
          </div>
          <WavyFrame className="relative mx-auto aspect-[1024/850] w-full max-w-md md:order-first">
            <Image
              src="/brand/dragon-illustration.png"
              alt=""
              fill
              className="object-cover"
              priority
            />
          </WavyFrame>
        </div>

        <div className="mt-12">
          <PartnerForm />
        </div>
      </div>
    </section>
  );
}
