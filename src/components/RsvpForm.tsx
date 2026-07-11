"use client";

import { useState, FormEvent } from "react";
import { SubmitButton } from "@/components/Button";

export default function RsvpForm({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(form);
    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
    };

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setStatus("error");
        setErrorMessage(
          typeof body?.error === "string" ? body.error : "That didn't go through. Check your details and try again."
        );
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMessage("That didn't go through. Check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-lilac/40 bg-surface p-6 text-center">
        <p className="font-voice text-xl text-parchment">You&rsquo;re on the list!</p>
        <p className="mt-2 text-sm text-muted">We sent a confirmation to your email. See you there.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="firstName" label="First name" required />
        <TextField name="lastName" label="Last name" required />
      </div>
      <TextField name="email" label="Email" type="email" required />

      {status === "error" ? <p className="text-sm text-candle">{errorMessage}</p> : null}

      <SubmitButton disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Confirm RSVP"}
      </SubmitButton>
    </form>
  );
}

function TextField({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment placeholder:text-muted/60 focus:border-lilac"
      />
    </label>
  );
}
