"use client";

import { useState, FormEvent } from "react";
import { SubmitButton } from "@/components/Button";

export default function NewsletterSignup() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("submitting");

    const email = String(new FormData(form).get("email") ?? "");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="border-t border-hairline bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="eyebrow mb-3">Stay in the know</p>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Be the first to hear when sisterhood applications open, new reads,
          live events, and exclusive drops!
        </p>

        {status === "success" ? (
          <p className="mt-6 font-voice text-lg text-parchment">
            You&rsquo;re on the list.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
            <label className="block flex-1">
              <span className="mb-2 block text-sm text-muted">
                Enter your email here <span className="text-candle">*</span>
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-hairline bg-surfaceRaised px-4 py-3 text-sm text-parchment placeholder:text-muted/60 focus:border-candle"
              />
            </label>
            <div className="sm:mt-8">
              <SubmitButton disabled={status === "submitting"}>
                {status === "submitting" ? "Signing up…" : "Sign Up"}
              </SubmitButton>
            </div>
          </form>
        )}

        {status === "error" ? (
          <p className="mt-3 text-sm text-candle">
            That didn&rsquo;t go through. Check your email and try again.
          </p>
        ) : null}
      </div>
    </section>
  );
}
