import { FaTiktok, FaInstagram, FaYoutube } from "react-icons/fa6";

// These aren't generic "share this URL" intents -- TikTok/Instagram/YouTube
// don't support that the way Facebook/X/LinkedIn do. Instead, these link
// straight to the sisterhood's own profiles, so anyone on an event page can
// quickly find where the event is actually happening/being streamed.
const PROFILES = [
  { href: "https://www.tiktok.com/@moonlitmarginssisterhood", label: "TikTok", Icon: FaTiktok },
  { href: "https://www.instagram.com/moonlitmarginssisterhood", label: "Instagram", Icon: FaInstagram },
  { href: "https://www.youtube.com/@themoonlitmarginssisterhood", label: "YouTube", Icon: FaYoutube },
];

export default function ShareRow() {
  return (
    <div>
      <p className="mb-3 text-sm text-muted">Find us on</p>
      <div className="flex items-center gap-3">
        {PROFILES.map(({ href, label, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            title={label}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-lilac hover:text-parchment"
          >
            <Icon size={14} />
          </a>
        ))}
      </div>
    </div>
  );
}
