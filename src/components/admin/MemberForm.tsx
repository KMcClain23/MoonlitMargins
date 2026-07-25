"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/admin/ImageUpload";
import PhotoPositioner from "@/components/admin/PhotoPositioner";
import { SOCIAL_PLATFORMS, type SocialsMap } from "@/lib/socials";

type MemberValues = {
  id?: string;
  full_name?: string;
  role?: string | null;
  bio?: string | null;
  email?: string | null;
  photo_url?: string | null;
  photo_zoom?: number;
  photo_offset_x?: number;
  photo_offset_y?: number;
  socials?: SocialsMap | null;
  tier?: "founder" | "council" | "junior_council" | "member";
  hide_from_directory?: boolean | null;
  state?: string | null;
  country?: string | null;
};

// Short, maintainable list rather than a full ~195-country roster --
// "Other" reveals a free-text input for anything not listed. Country
// names are stored as-is (matches GET /api/directory/countries reading
// distinct values straight off members.country), so whatever's typed
// into "Other" becomes the canonical value for that member.
const COMMON_COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "New Zealand", "Ireland"];

// 2-letter code -> display name, sorted alphabetically by name for the
// dropdown below. Matches the same 50 states + DC set as
// src/lib/stateAdjacency.ts's STATE_NEIGHBORS keys (kept as a separate
// list here since that file only has codes, not display names).
const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export default function MemberForm({
  member,
  onDone,
  existingNames,
}: {
  member?: MemberValues;
  onDone?: () => void;
  existingNames?: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(member?.id);

  const [nameInput, setNameInput] = useState(member?.full_name ?? "");
  const isDuplicateName =
    existingNames?.some(
      (name) => name.trim().toLowerCase() === nameInput.trim().toLowerCase() && name !== member?.full_name
    ) ?? false;

  const [photoUrl, setPhotoUrl] = useState(member?.photo_url ?? "");
  const [photoZoom, setPhotoZoom] = useState(member?.photo_zoom ?? 1);
  const [photoOffsetX, setPhotoOffsetX] = useState(member?.photo_offset_x ?? 0);
  const [photoOffsetY, setPhotoOffsetY] = useState(member?.photo_offset_y ?? 0);
  const [hideFromDirectory, setHideFromDirectory] = useState(member?.hide_from_directory ?? false);

  // Splits the stored country into "which preset (if any)" + "the actual
  // free-text value when it's not one of the presets" -- lets the select
  // start on "Other" already showing the real value instead of silently
  // snapping an unlisted country back to "United States".
  const initialCountry = member?.country ?? "United States";
  const isPresetCountry = COMMON_COUNTRIES.includes(initialCountry);
  const [countrySelection, setCountrySelection] = useState(isPresetCountry ? initialCountry : "Other");
  const [customCountry, setCustomCountry] = useState(isPresetCountry ? "" : initialCountry);
  const effectiveCountry = countrySelection === "Other" ? customCountry.trim() : countrySelection;
  // State is only meaningful for US members -- this feature's whole
  // reason for existing (see stateAdjacency.ts) is US-neighbor search.
  const isUnitedStates = effectiveCountry === "United States";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setError("");

    const formData = new FormData(form);
    const socials: SocialsMap = {};
    for (const platform of SOCIAL_PLATFORMS) {
      const value = String(formData.get(`social_${platform.key}`) ?? "").trim();
      if (value) socials[platform.key] = value;
    }

    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      role: String(formData.get("role") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      email: String(formData.get("email") ?? ""),
      photoUrl: String(formData.get("photoUrl") ?? ""),
      photoZoom,
      photoOffsetX,
      photoOffsetY,
      socials,
      tier: String(formData.get("tier") ?? "member"),
      hideFromDirectory,
      state: isUnitedStates ? String(formData.get("state") ?? "") : "",
      country: effectiveCountry,
    };

    const url = isEditing ? `/api/admin/members/${member!.id}` : "/api/admin/members";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      setError(`Couldn't ${isEditing ? "save" : "add"} that member. Check the fields and try again.`);
      return;
    }

    if (!isEditing) {
      form.reset();
      setNameInput("");
      setPhotoUrl("");
      setPhotoZoom(1);
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      setHideFromDirectory(false);
      setCountrySelection("United States");
      setCustomCountry("");
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="font-voice text-lg text-parchment">{isEditing ? "Edit member" : "New member"}</p>
        {isEditing && onDone ? (
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-parchment">
            Cancel
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Full name</span>
          <input
            name="fullName"
            required
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
          {isDuplicateName ? (
            <p className="mt-1.5 text-xs text-candle">
              A member named &ldquo;{nameInput.trim()}&rdquo; already exists. Check you&rsquo;re not creating a duplicate.
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Role (e.g. Co-President)</span>
          <input
            name="role"
            defaultValue={member?.role ?? ""}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">
            Email <span className="text-muted/70">(private event invites, not a login)</span>
          </span>
          <input
            name="email"
            type="email"
            defaultValue={member?.email ?? ""}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Tier</span>
          <select
            name="tier"
            defaultValue={member?.tier ?? "member"}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          >
            <option value="founder">Founder / Co-President</option>
            <option value="council">Leadership council</option>
            <option value="junior_council">Junior council</option>
            <option value="member">Member</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">Country</span>
          <select
            value={countrySelection}
            onChange={(e) => setCountrySelection(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          >
            {COMMON_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          {countrySelection === "Other" ? (
            <input
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value)}
              placeholder="Country name"
              className="mt-1.5 w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
            />
          ) : null}
        </label>

        {isUnitedStates ? (
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">
              State <span className="text-muted/70">(optional -- used by the public directory)</span>
            </span>
            <select
              name="state"
              defaultValue={member?.state ?? ""}
              className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
            >
              <option value="">Not set</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[auto_1fr]">
          <div>
            <span className="mb-1.5 block text-xs text-muted">Photo</span>
            {photoUrl ? (
              <PhotoPositioner
                imageUrl={photoUrl}
                zoom={photoZoom}
                offsetX={photoOffsetX}
                offsetY={photoOffsetY}
                onChange={(next) => {
                  setPhotoZoom(next.zoom);
                  setPhotoOffsetX(next.offsetX);
                  setPhotoOffsetY(next.offsetY);
                }}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-hairline text-[10px] text-muted">
                No photo
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <ImageUpload
              name="photoUrl"
              label=""
              folder="members"
              initialValue={member?.photo_url}
              onValueChange={(next) => {
                setPhotoUrl(next);
                if (next !== (member?.photo_url ?? "")) {
                  setPhotoZoom(1);
                  setPhotoOffsetX(0);
                  setPhotoOffsetY(0);
                }
              }}
            />
          </div>
        </div>

        <div className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs text-muted">Socials (leave blank to skip a platform)</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {SOCIAL_PLATFORMS.map((platform) => (
              <label key={platform.key} className="block">
                <span className="mb-1 block text-[11px] text-muted">{platform.label}</span>
                <input
                  name={`social_${platform.key}`}
                  placeholder={platform.placeholder}
                  defaultValue={member?.socials?.[platform.key] ?? ""}
                  className="w-full rounded-lg border border-hairline bg-ink px-3 py-1.5 text-sm text-parchment focus:border-lilac"
                />
              </label>
            ))}
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs text-muted">Bio</span>
          <textarea
            name="bio"
            rows={3}
            defaultValue={member?.bio ?? ""}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={hideFromDirectory}
            onChange={(e) => setHideFromDirectory(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          <span className="text-xs text-muted">Hide from public &ldquo;Find a Sister&rdquo; directory</span>
        </label>
      </div>

      {error ? <p className="text-sm text-candle">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-lilac px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-lilac-soft disabled:opacity-50"
      >
        {loading ? "Saving…" : isEditing ? "Save changes" : "Add member"}
      </button>
    </form>
  );
}
