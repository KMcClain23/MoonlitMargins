import Image from "next/image";
import Chapter from "@/components/Chapter";
import PartnerForm from "@/components/PartnerForm";

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
          <div className="relative mx-auto aspect-[1024/850] w-full max-w-md overflow-hidden rounded-2xl md:order-first">
            <Image
              src="/brand/dragon-illustration.png"
              alt=""
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="mt-12">
          <PartnerForm />
        </div>
      </div>
    </section>
  );
}
