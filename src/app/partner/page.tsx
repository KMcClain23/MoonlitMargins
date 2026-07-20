import Chapter from "@/components/Chapter";
import PartnerForm from "@/components/PartnerForm";

export default function PartnerPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="starfield-subtle" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <Chapter number="two" title="Interview or partner with us" />
        <h1 className="font-voice text-4xl text-parchment">
          Let&rsquo;s work together.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          We regularly feature and interview the narrators and authors behind the books we read,
          and we work directly with authors to feature, discuss, and champion their books with
          our members. Choose whichever fits below.
        </p>

        {/* DRAFT COPY -- Dean, please edit this to say exactly what you want
            applicants to know before they apply. */}
        <div className="mt-10 rounded-2xl border border-hairline bg-surface p-6">
          <p className="font-voice text-lg text-parchment">What&rsquo;s required of me if I&rsquo;m accepted?</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Once we confirm a date, we ask that you&rsquo;re responsive to scheduling, share the
            requested materials (book, links, cover art) ahead of time, and show up ready to talk
            candidly about your work. For partnerships, we ask that the agreed format (physical
            copy, eBook, or audiobook access) reaches our members with enough lead time to read
            and prepare before the feature goes live.
          </p>
        </div>

        <div className="mt-12">
          <PartnerForm />
        </div>
      </div>
    </section>
  );
}
