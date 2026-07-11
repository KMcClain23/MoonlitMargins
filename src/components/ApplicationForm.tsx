"use client";

import { useState, FormEvent } from "react";
import { SubmitButton } from "@/components/Button";

export type FormField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox-group";
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

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

    const answers: Record<string, string> = {};
    for (const field of fields) {
      answers[field.name] =
        field.type === "checkbox-group"
          ? formData.getAll(field.name).join(", ")
          : String(formData.get(field.name) ?? "");
    }

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
        className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment placeholder:text-muted/60 focus:border-lilac"
      />
    </label>
  );
}

function Field({ field }: { field: FormField }) {
  if (field.type === "textarea") {
    return (
      <label className="block">
        <span className="mb-2 block text-sm text-muted">{field.label}</span>
        <textarea
          name={field.name}
          required={field.required}
          placeholder={field.placeholder}
          rows={4}
          className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment placeholder:text-muted/60 focus:border-lilac"
        />
      </label>
    );
  }

  if (field.type === "checkbox-group") {
    return (
      <fieldset>
        <legend className="mb-2 block text-sm text-muted">
          {field.label}
          {field.required ? <span className="text-candle"> *</span> : null}
        </legend>
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-parchment">
              <input
                type="checkbox"
                name={field.name}
                value={option}
                className="h-4 w-4 rounded border-hairline"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="mb-2 block text-sm text-muted">{field.label}</span>
        <select
          name={field.name}
          required={field.required}
          defaultValue=""
          className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac"
        >
          <option value="" disabled>
            Choose one
          </option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return <TextField name={field.name} label={field.label} required={field.required} />;
}
