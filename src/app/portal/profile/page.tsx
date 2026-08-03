"use client";

import { useEffect, useState, FormEvent } from "react";

type MemberMe = {
  phone: string | null;
  contactsHideFromDirectory: boolean;
  contactsShareLastName: boolean;
  contactsShareEmail: boolean;
  contactsSharePhone: boolean;
  contactsShareSocials: boolean;
  contactsSharePhoto: boolean;
};

export default function PortalProfilePage() {
  const [loaded, setLoaded] = useState(false);
  const [phone, setPhone] = useState("");
  const [hideFromDirectory, setHideFromDirectory] = useState(false);
  const [shareLastName, setShareLastName] = useState(true);
  const [shareEmail, setShareEmail] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);
  const [shareSocials, setShareSocials] = useState(true);
  const [sharePhoto, setSharePhoto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/portal/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MemberMe | null) => {
        if (!data) return;
        setPhone(data.phone ?? "");
        setHideFromDirectory(data.contactsHideFromDirectory);
        setShareLastName(data.contactsShareLastName);
        setShareEmail(data.contactsShareEmail);
        setSharePhone(data.contactsSharePhone);
        setShareSocials(data.contactsShareSocials);
        setSharePhoto(data.contactsSharePhoto);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("idle");

    const res = await fetch("/api/portal/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.trim() || null,
        contactsHideFromDirectory: hideFromDirectory,
        contactsShareLastName: shareLastName,
        contactsShareEmail: shareEmail,
        contactsSharePhone: sharePhone,
        contactsShareSocials: shareSocials,
        contactsSharePhoto: sharePhoto,
      }),
    });

    setSaving(false);
    setStatus(res.ok ? "saved" : "error");
  }

  if (!loaded) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-voice text-3xl text-parchment">My Profile</h1>
      <p className="mt-1 text-sm text-muted">
        Control what the rest of the sisterhood sees about you in the Contacts directory.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-hairline bg-surface p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Not set"
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <div className="border-t border-hairline pt-4">
          <ToggleRow
            label="List me in the Contacts directory"
            description="Turning this off hides you from Contacts entirely, regardless of the settings below. Your first name always shows if you're listed at all."
            checked={!hideFromDirectory}
            onChange={(checked) => setHideFromDirectory(!checked)}
          />
        </div>

        <div className="space-y-4 border-t border-hairline pt-4">
          <p className="text-xs text-muted">If you&rsquo;re listed, also share:</p>
          <ToggleRow
            label="Last name"
            checked={shareLastName}
            onChange={setShareLastName}
            disabled={hideFromDirectory}
          />
          <ToggleRow label="Photo" checked={sharePhoto} onChange={setSharePhoto} disabled={hideFromDirectory} />
          <ToggleRow label="Email" checked={shareEmail} onChange={setShareEmail} disabled={hideFromDirectory} />
          <ToggleRow
            label="Phone number"
            checked={sharePhone}
            onChange={setSharePhone}
            disabled={hideFromDirectory}
          />
          <ToggleRow
            label="Social links"
            checked={shareSocials}
            onChange={setShareSocials}
            disabled={hideFromDirectory}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-hairline pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {status === "saved" ? <span className="text-xs text-lilac-soft">Saved!</span> : null}
          {status === "error" ? <span className="text-xs text-candle">Couldn&rsquo;t save. Try again.</span> : null}
        </div>
      </form>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span>
        <span className="block text-sm text-parchment">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute inset-0 rounded-full border border-hairline transition-colors ${
            checked ? "bg-lilac" : "bg-surfaceRaised"
          }`}
        />
        <span
          className={`absolute left-0.5 h-5 w-5 rounded-full bg-ink transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}
