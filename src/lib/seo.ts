// Central source of truth for the site's canonical origin. The site isn't
// live on this domain yet (still on Wix at the time this was written) --
// every canonical/OG/JSON-LD URL in the app is built from this constant
// specifically so that pointing the whole site at a different origin
// later (or back to a Vercel preview URL for staging) is a one-line env
// var change, not a find-and-replace across every page.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.themoonlitmarginssisterhood.com").replace(
  /\/$/,
  ""
);

export const SITE_NAME = "The Moonlit Margins Sisterhood";

// The exact social URLs already used in Footer.tsx -- kept here too since
// the homepage's Organization JSON-LD (sameAs) needs the same list, and
// duplicating four short strings is simpler than importing a component
// file's internal constant into a schema-building context.
export const SOCIAL_URLS = [
  "https://www.tiktok.com/@moonlitmarginssisterhood",
  "https://www.instagram.com/moonlitmarginssisterhood",
  "https://www.facebook.com/groups/themoonlitmarginssisterhood",
  "https://www.youtube.com/@themoonlitmarginssisterhood",
];

/** Resolves a site-relative path to an absolute URL under SITE_URL. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Used as the default og:image/twitter:image across every page's metadata.
// Not the auto-generated 1200x630 opengraph-image.tsx -- that one remains
// as the file-convention fallback for any route that doesn't set its own
// `images`, but every page below sets this brand mark explicitly per the
// spec this was built against.
export const DEFAULT_OG_IMAGE = {
  url: absoluteUrl("/brand/moon-flame-emblem.png"),
  alt: `${SITE_NAME} emblem`,
};
