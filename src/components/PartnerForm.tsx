"use client";

import { useEffect, useState, FormEvent } from "react";
import { SubmitButton } from "@/components/Button";
import { Field, TextField, collectAnswers, type FormField } from "@/components/FormFields";

const INTERVIEW_FIELDS: FormField[] = [
  {
    name: "role",
    label: "Which best describes you?",
    type: "checkbox-group",
    required: true,
    options: ["Author", "Narrator"],
  },
  {
    name: "genres",
    label: "What genres do you work in? (e.g. romance, fantasy, thriller, nonfiction, etc.)",
    type: "text",
    required: true,
  },
  {
    name: "workTitle",
    label: "Book or audiobook you'd like to talk about",
    type: "text",
    required: true,
  },
  {
    name: "latestProject",
    label: "Tell us about your latest book or project",
    type: "textarea",
    required: true,
  },
  {
    name: "upcomingReleases",
    label: "Are there upcoming releases or projects you'd like to share during your interview?",
    type: "textarea",
    required: true,
  },
  {
    name: "whyFeature",
    label: "Why would you like to be featured by the Moonlit Margins Sisterhood?",
    type: "textarea",
    required: true,
  },
  {
    name: "attendeeCount",
    label: "How many will attend the interview?",
    type: "text",
    required: true,
  },
  {
    name: "datePreferred",
    label: "Date preferred?",
    type: "text",
    required: true,
  },
  {
    name: "authorType",
    label: "Indie author or publishing house?",
    type: "select",
    required: true,
    options: ["Indie / self-published", "Traditional publishing house"],
  },
  {
    name: "publishingHouseName",
    label: "If a publishing house -- which house?",
    type: "text",
  },
  {
    name: "needsBookReadPrior",
    label: "Does the book need to be read prior to the interview?",
    type: "select",
    required: true,
    options: ["Yes", "No"],
  },
  {
    name: "details",
    label: "Is there anything else you'd like us to know?",
    type: "textarea",
  },
  {
    name: "links",
    label: "Links to your work (Amazon, Audible, website, etc.)",
    type: "textarea",
  },
];

const COLLAB_FIELDS: FormField[] = [
  {
    name: "websiteUrl",
    label: "Website or author page (if applicable)",
    type: "text",
  },
  {
    name: "bookTitle",
    label: "Title of the book",
    type: "text",
    required: true,
  },
  {
    name: "genre",
    label: "Genre",
    type: "text",
    required: true,
  },
  {
    name: "publicationStatus",
    label: "Is this book:",
    type: "checkbox-group",
    options: ["Published", "Upcoming release", "ARC / Advanced Reader Copy"],
  },
  {
    name: "bookDescription",
    label: "Brief description of your book (blurb or summary)",
    type: "textarea",
    required: true,
  },
  {
    name: "collabType",
    label: "What kind of partnership are you looking for?",
    type: "checkbox-group",
    options: [
      "Book of the Month feature",
      "Group discussion / reading sprint",
      "Author interview",
      "ARC / ALC distribution to members",
      "Something else",
    ],
  },
  {
    name: "whyUs",
    label: "Why would you like the Moonlit Margins Sisterhood to read your book?",
    type: "textarea",
    required: true,
  },
  {
    name: "format",
    label: "Is your book available in:",
    type: "checkbox-group",
    required: true,
    options: ["Physical copy", "eBook", "Audiobook"],
  },
  {
    name: "participation",
    label: "Are you open to participating in:",
    type: "checkbox-group",
    required: true,
    options: ["Live discussion", "Q&A", "Social media feature"],
  },
  {
    name: "details",
    label: "Anything else you'd like us to know about your book or your vision?",
    type: "textarea",
  },
];

type Mode = "interview" | "collab";

export default function PartnerForm() {
  const [mode, setMode] = useState<Mode>("interview");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "collab") setMode("collab");
  }, []);

  const fields = mode === "interview" ? INTERVIEW_FIELDS : COLLAB_FIELDS;

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
      kind: mode, // stays "interview" / "collab" in the database regardless of the "Partner" label
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
    <div>
      <div className="mb-8 inline-flex rounded-full border border-hairline p-1">
        <button
          type="button"
          onClick={() => setMode("interview")}
          className={`rounded-full px-5 py-2 text-sm transition-colors ${
            mode === "interview" ? "bg-lilac text-ink" : "text-muted hover:text-parchment"
          }`}
        >
          Interview with us
        </button>
        <button
          type="button"
          onClick={() => setMode("collab")}
          className={`rounded-full px-5 py-2 text-sm transition-colors ${
            mode === "collab" ? "bg-lilac text-ink" : "text-muted hover:text-parchment"
          }`}
        >
          Partner with us
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="fullName" label="Full name" required />
          <TextField name="email" label="Email" type="email" required />
          <TextField name="instagramHandle" label="Instagram handle" />
          <TextField name="tiktokHandle" label="TikTok handle" />
        </div>

        {fields.map((field) => (
          <Field key={`${mode}-${field.name}`} field={field} />
        ))}

        {status === "error" ? <p className="text-sm text-candle">{errorMessage}</p> : null}

        <SubmitButton disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Submit application"}
        </SubmitButton>
      </form>
    </div>
  );
}
