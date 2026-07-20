"use client";

import { useState, FormEvent } from "react";
import { SubmitButton } from "@/components/Button";
import { Field, TextField, collectAnswers, type FormField } from "@/components/FormFields";

export type { FormField };

export default function ApplicationForm({
  kind,
  fields,
}: {
  kind: "member" | "interview" | "collab";
  fields: FormField[];
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(form);

    for (const field of fields) {
      if (field.type === "checkbox-group" && field.required && formData.getAll(field.name).length === 0) {
        setStatus("error");
        setErrorMessage(`Select at least one option for "${field.label.replace(/:$/, "")}".`);
        return;
      }
    }

    const answers = collectAnswers(formData, fields);

    const payload = {
      kind,
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      instagramHandle: String(formData.get("instagramHandle") ?? ""),
      tiktokHandle: String(formData.get("tiktokHandle") ?? ""),
      answers,
    };

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setStatus("error");
        setErrorMessage("That didn't go through. Check your details and try again.");
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
      <div className="rounded-2xl border border-lilac/40 bg-surface p-8 text-center">
        <p className="font-voice text-2xl text-parchment">You&rsquo;re in the margin now.</p>
        <p className="mt-3 text-sm text-muted">
          We received your submission and sent a confirmation to your email.
          Someone from our team will follow up soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="fullName" label="Full name" required />
        <TextField name="email" label="Email" type="email" required />
        <TextField name="instagramHandle" label="Instagram handle" />
        <TextField name="tiktokHandle" label="TikTok handle" />
      </div>

      {fields.map((field) => (
        <Field key={field.name} field={field} />
      ))}

      {status === "error" ? (
        <p className="text-sm text-candle">{errorMessage}</p>
      ) : null}

      <SubmitButton disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Submit application"}
      </SubmitButton>
    </form>
  );
}
