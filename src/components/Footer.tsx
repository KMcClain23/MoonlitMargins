import Link from "next/link";

const SOCIALS = [
  { href: "https://www.tiktok.com/@moonlitmarginssisterhood", label: "TikTok" },
  { href: "https://www.instagram.com/moonlitmarginssisterhood", label: "Instagram" },
  { href: "https://www.facebook.com/groups/themoonlitmarginssisterhood", label: "Facebook" },
  { href: "https://www.pinterest.com/themoonlitmargins_sisterhood", label: "Pinterest" },
];

export default function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-voice text-lg text-parchment">Moonlit Margins</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              A sisterhood of readers across the country, connected through
              stories and showing up for each other.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-4">Find your way</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/sisterhood" className="hover:text-parchment">The sisterhood</Link></li>
              <li><Link href="/join" className="hover:text-parchment">Join the sisterhood</Link></li>
              <li><Link href="/events" className="hover:text-parchment">Events</Link></li>
              <li><Link href="/memories" className="hover:text-parchment">Memories</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">Say hello</p>
            <ul className="space-y-2 text-sm text-muted">
              {SOCIALS.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className="hover:text-parchment" target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-12 text-xs text-muted">
          © {new Date().getFullYear()} The Moonlit Margins Sisterhood. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
