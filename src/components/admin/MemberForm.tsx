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
};

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
  const [nameInput, setNameInput] = useState(member?.full_name ?? "");
  const isDuplicateName =
    existingNames?.some(
      (name) => name.trim().toLowerCase() === nameInput.trim().toLowerCase() && name !== member?.full_name
    ) ?? false;

  const [photoUrl, setPhotoUrl] = useState(member?.photo_url ?? "");
  const [photoZoom, setPhotoZoom] = useState(member?.photo_zoom ?? 1);
  const [photoOffsetX, setPhotoOffsetX] = useState(member?.photo_offset_x ?? 0);
  const [photoOffsetY, setPhotoOffsetY] = useState(member?.photo_offset_y ?? 0);

  const isEditing = Boolean(member?.id);

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
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="font-voice text-lg text-parchment">{isEditing ? "Edit member" : "New member"}</p>
        {isEditing && onDone ? (
          <button type="button" onClick={onDone} className="text-xs text-muted hover:text-parchment">
            Cancel
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Full name</span>
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
          <span className="mb-2 block text-sm text-muted">Role (e.g. Co-President)</span>
          <input
            name="role"
            defaultValue={member?.role ?? ""}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-muted">
            Email (used to invite them to private events -- not a login)
          </span>
          <input
            name="email"
            type="email"
            defaultValue={member?.email ?? ""}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <div className="sm:col-span-2 space-y-3">
          <ImageUpload
            name="photoUrl"
            label="Photo"
            folder="members"
            initialValue={member?.photo_url}
            onValueChange={(next) => {
              setPhotoUrl(next);
              // A crop tuned for the old photo doesn't carry any meaning for
              // a different image, so swapping in a new upload resets
              // positioning to default rather than silently misapplying it.
              if (next !== (member?.photo_url ?? "")) {
                setPhotoZoom(1);
                setPhotoOffsetX(0);
                setPhotoOffsetY(0);
              }
            }}
          />
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
          ) : null}
        </div>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm text-muted">Tier</span>
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

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm text-muted">Bio</span>
          <textarea
            name="bio"
            rows={3}
            defaultValue={member?.bio ?? ""}
            className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
          />
        </label>

        <div className="block sm:col-span-2">
          <span className="mb-2 block text-sm text-muted">Socials (leave blank to skip a platform)</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_PLATFORMS.map((platform) => (
              <label key={platform.key} className="block">
                <span className="mb-1 block text-xs text-muted">{platform.label}</span>
                <input
                  name={`social_${platform.key}`}
                  placeholder={platform.placeholder}
                  defaultValue={member?.socials?.[platform.key] ?? ""}
                  className="w-full rounded-lg border border-hairline bg-ink px-3 py-2 text-sm text-parchment focus:border-lilac"
                />
              </label>
            ))}
          </div>
        </div>
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
