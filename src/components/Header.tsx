import Link from "next/link";
import MoonFlameMark from "@/components/icons/MoonFlameMark";
import SearchOverlay from "@/components/SearchOverlay";
import MobileNav from "@/components/MobileNav";

const NAV_LINKS = [
  { href: "/sisterhood", label: "The sisterhood" },
  { href: "/events", label: "Events" },
  { href: "/memories", label: "Memories" },
  { href: "/interview", label: "Interview with us" },
  { href: "/collab", label: "Collab with us" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-voice text-lg tracking-wide text-parchment">
          <MoonFlameMark size={26} />
          Moonlit Margins
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-parchment"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SearchOverlay />
          <Link
            href="/join"
            className="hidden rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft md:inline-flex"
          >
            Apply to join
          </Link>
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
