// Central source of truth for the site's canonical origin. Every
// canonical/OG/JSON-LD URL in the app is built from this constant so
// retargeting the whole site to a different origin is a one-line change,
// not a find-and-replace across every page.
//
// Root cause of a real bug this fallback chain fixes: this constant used
// to hardcode the future custom domain as its ONLY fallback, with no
// production env var ever set on Vercel to override it. That meant every
// og:image/canonical/JSON-LD URL in production pointed at
// www.themoonlitmarginssisterhood.com -- which is still 100% Wix (verified
// live: DNS resolves to wixdns.net, and fetching that exact image path
// there 404s) -- while the site was only actually reachable at
// moonlit-margins.vercel.app. Discord/WhatsApp/iMessage all read the
// og:image tag fine and then tried to fetch an image from a host that was
// never serving this app, which is exactly "title/description show, image
// never loads, identically on every platform."
//
// VERCEL_PROJECT_PRODUCTION_URL is a system env var Vercel injects
// automatically (build- and run-time, every environment) with whatever
// domain is actually assigned as this project's Production domain --
// moonlit-margins.vercel.app today, and it'll update itself to
// www.themoonlitmarginssisterhood.com the moment that custom domain is
// assigned as Production in Vercel's dashboard, with no code or env var
// change needed. NEXT_PUBLIC_SITE_URL still exists as an explicit manual
// override on top of that (e.g. for pointing at a domain Vercel doesn't
// know about), but is no longer required just to make OG images work.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
  "https://www.themoonlitmarginssisterhood.com"
).replace(/\/$/, "");

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
// There used to also be a file-convention src/app/opengraph-image.tsx
// generating a 1200x630 image -- removed, since every route already sets
// this explicit `images` array (confirmed live: the rendered page only
// ever had one og:image tag, the explicit one below, not two), so the
// file was dead code that also still had the old placeholder logo nobody
// had fixed. One mechanism, not two competing ones.
export const DEFAULT_OG_IMAGE = {
  url: absoluteUrl("/brand/dragon-illustration.png"),
  alt: `${SITE_NAME} dragon illustration`,
};
