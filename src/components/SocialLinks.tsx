import { FaTiktok, FaInstagram, FaFacebookF, FaYoutube } from "react-icons/fa6";

const SOCIALS = [
  { href: "https://www.tiktok.com/@moonlitmarginssisterhood", label: "TikTok", Icon: FaTiktok },
  { href: "https://www.instagram.com/moonlitmarginssisterhood", label: "Instagram", Icon: FaInstagram },
  { href: "https://www.facebook.com/groups/themoonlitmarginssisterhood", label: "Facebook", Icon: FaFacebookF },
  { href: "https://www.youtube.com/@themoonlitmarginssisterhood", label: "YouTube", Icon: FaYoutube },
];

export default function SocialLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-5">
      {SOCIALS.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-parchment ring-1 ring-hairline transition-all hover:scale-105 hover:bg-lilac hover:text-ink"
        >
          <Icon size={24} />
        </a>
      ))}
    </div>
  );
}
