"use client";

import { useEffect, useState, FormEvent } from "react";
import { LinkButton, SubmitButton } from "@/components/Button";
import MemberAvatarImage from "@/components/MemberAvatarImage";

// 2-letter code -> display name, sorted alphabetically by name -- same
// 50 states + DC set as src/lib/stateAdjacency.ts's STATE_NEIGHBORS keys
// (kept as a separate list here since that file only has codes, and
// this needs display names for the dropdown).
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

type NearbyMember = {
  displayName: string;
  photoUrl: string | null;
  photoZoom: number;
  photoOffsetX: number;
  photoOffsetY: number;
  // Present depending on which search mode produced this result --
  // GET /api/directory/nearby returns `state` for ?state= searches,
  // `country` for ?country= ones, never both.
  state?: string | null;
  country?: string | null;
};

type Mode = "state" | "country";

export default function FindASisterSearch() {
  const [mode, setMode] = useState<Mode>("state");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  // null = hasn't searched yet, [] = searched, genuinely no results.
  const [results, setResults] = useState<NearbyMember[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Only real options -- countries that actually have members -- rather
  // than a static guessed list. Fetched once up front so the dropdown is
  // already populated the moment someone switches to "By Country".
  useEffect(() => {
    fetch("/api/directory/countries")
      .then((res) => (res.ok ? (res.json() as Promise<string[]>) : []))
      .then(setCountries)
      .catch(() => {
        // Purely decorative on failure -- the dropdown just stays empty
        // rather than blocking the rest of the page.
      });
  }, []);

  // Switching modes clears any previous search -- a state-search result
  // grid showing while "By Country" is selected (or vice versa) would
  // read as if that result came from the wrong kind of search.
  function handleModeChange(next: Mode) {
    setMode(next);
    setResults(null);
    setErrorMessage("");
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = mode === "state" ? selectedState : selectedCountry;
    if (!value) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const param = mode === "state" ? `state=${encodeURIComponent(value)}` : `country=${encodeURIComponent(value)}`;
      const res = await fetch(`/api/directory/nearby?${param}`);
      if (!res.ok) {
        setStatus("error");
        setErrorMessage("That didn't go through. Try again.");
        return;
      }
      const data = (await res.json()) as NearbyMember[];
      setResults(data);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("That didn't go through. Check your connection and try again.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange("state")}
          className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
            mode === "state"
              ? "border-lilac bg-lilac text-ink"
              : "border-muted/40 text-muted hover:border-parchment hover:text-parchment"
          }`}
        >
          Search by US State
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("country")}
          className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
            mode === "country"
              ? "border-lilac bg-lilac text-ink"
              : "border-muted/40 text-muted hover:border-parchment hover:text-parchment"
          }`}
        >
          Search by Country
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {mode === "state" ? (
          <label className="block flex-1">
            <span className="mb-2 block text-sm text-muted">Your state</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              required
              className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac"
            >
              <option value="" disabled>
                Choose your state
              </option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block flex-1">
            <span className="mb-2 block text-sm text-muted">Your country</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              required
              disabled={countries.length === 0}
              className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac disabled:opacity-50"
            >
              <option value="" disabled>
                {countries.length === 0 ? "No countries available yet" : "Choose your country"}
              </option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        <SubmitButton disabled={(mode === "state" ? !selectedState : !selectedCountry) || status === "loading"}>
          {status === "loading" ? "Searching…" : "Search"}
        </SubmitButton>
      </form>

      {errorMessage ? <p className="mt-4 text-sm text-candle">{errorMessage}</p> : null}

      {results !== null ? (
        results.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-hairline bg-surface p-8 text-center">
            <p className="font-voice text-xl text-parchment">
              No sisters found nearby yet &mdash; be the first!
            </p>
            <div className="mt-5">
              <LinkButton href="/join">Apply to join</LinkButton>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            {results.map((member, index) => (
              <MemberResultCard key={`${member.displayName}-${index}`} member={member} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function MemberResultCard({ member }: { member: NearbyMember }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-surface p-5 text-center transition-colors hover:border-lilac/40 hover:bg-surfaceRaised">
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surfaceRaised"
        style={{ width: 72, height: 72 }}
      >
        {member.photoUrl ? (
          <MemberAvatarImage
            src={member.photoUrl}
            alt={member.displayName}
            size={72}
            zoom={member.photoZoom}
            offsetX={member.photoOffsetX}
            offsetY={member.photoOffsetY}
          />
        ) : (
          <span className="font-voice text-xl text-lilac-soft">{member.displayName.charAt(0)}</span>
        )}
      </div>
      <p className="mt-2 font-voice text-base text-parchment">{member.displayName}</p>
      {member.state ? <p className="text-xs text-lilac-soft">{member.state}</p> : null}
    </div>
  );
}
