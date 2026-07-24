import Chapter from "@/components/Chapter";
import { LinkButton } from "@/components/Button";
import FindASisterSearch from "@/components/FindASisterSearch";

export default function FindASisterPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="starfield-subtle" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-6 py-20">
        <Chapter number="one" title="Find a sister" />
        <h1 className="font-voice text-4xl text-parchment">Find a sister near you.</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Search by state to see sisters in your area and neighboring states &mdash;
          a little constellation of the sisterhood, close to home.
        </p>

        {/* Persistent, regardless of search results -- this page is for
            prospective members too, not just existing ones checking who's
            nearby. */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-5">
          <p className="text-sm text-muted">Not a member yet?</p>
          <LinkButton href="/join">Join the Sisterhood</LinkButton>
        </div>

        <div className="mt-10">
          <FindASisterSearch />
        </div>
      </div>
    </section>
  );
}
