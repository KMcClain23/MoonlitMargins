"use client";

import { useEffect, useState } from "react";
import { FaEnvelope, FaPhone } from "react-icons/fa6";
import MemberAvatarImage from "@/components/MemberAvatarImage";
import { SOCIAL_PLATFORMS, buildSocialUrl, type SocialsMap } from "@/lib/socials";

type Tier = "founder" | "council" | "junior_council" | "member";

// Mirrors GET /api/portal/contacts exactly -- optional fields are omitted
// from the response entirely (not null) when the member hasn't opted to
// share them, so their absence here means "don't render this," not
// "render a blank."
type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  tier: Tier;
  photoUrl?: string | null;
  photoZoom?: number;
  photoOffsetX?: number;
  photoOffsetY?: number;
  email?: string;
  phone?: string;
  socials?: SocialsMap;
};

const TIER_ORDER: Tier[] = ["founder", "council", "junior_council", "member"];
const TIER_LABELS: Record<Tier, string> = {
  founder: "Founder",
  council: "Council",
  junior_council: "Junior Council",
  member: "Member",
};

export default function PortalContactsView() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);

  useEffect(() => {
    fetch("/api/portal/contacts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setContacts(data?.contacts ?? []))
      .catch(() => setContacts([]));
  }, []);

  if (contacts === null) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div>
      <h1 className="font-voice text-3xl text-parchment">Contacts</h1>
      <p className="mt-1 text-sm text-muted">
        Everyone in the sisterhood who&rsquo;s chosen to be listed here, and whatever they&rsquo;ve chosen
        to share. Manage your own listing under My Profile.
      </p>

      {contacts.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No contacts to show yet.</p>
      ) : (
        TIER_ORDER.map((tier) => {
          // The API already returns rows ordered tier-first then
          // alphabetically -- filtering here preserves that order rather
          // than re-sorting.
          const group = contacts.filter((c) => c.tier === tier);
          if (group.length === 0) return null;

          return (
            <div key={tier} className="mt-8 first:mt-6">
              <h2 className="font-voice text-lg text-parchment">{TIER_LABELS[tier]}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {group.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  const hasContactInfo = Boolean(contact.email || contact.phone || contact.socials);

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-lilac/40">
      <div className="flex items-center gap-3">
        <ContactAvatar contact={contact} />
        <div>
          <p className="font-voice text-base text-parchment">
            {contact.firstName}
            {contact.lastName ? ` ${contact.lastName}` : ""}
          </p>
          {contact.tier !== "member" ? (
            <span className="mt-0.5 inline-block rounded-full border border-lilac/40 px-2 py-0.5 text-[10px] text-lilac-soft">
              {TIER_LABELS[contact.tier]}
            </span>
          ) : null}
        </div>
      </div>

      {hasContactInfo ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3">
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              aria-label="Email"
              title={contact.email}
              className="text-muted transition-colors hover:text-lilac-soft"
            >
              <FaEnvelope size={14} />
            </a>
          ) : null}
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              aria-label="Call"
              title={contact.phone}
              className="text-muted transition-colors hover:text-lilac-soft"
            >
              <FaPhone size={14} />
            </a>
          ) : null}
          {contact.socials ? <SocialIcons socials={contact.socials} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function ContactAvatar({ contact }: { contact: Contact }) {
  const size = 48;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surfaceRaised"
      style={{ width: size, height: size }}
    >
      {contact.photoUrl ? (
        <MemberAvatarImage
          src={contact.photoUrl}
          alt={contact.firstName}
          size={size}
          zoom={contact.photoZoom ?? 1}
          offsetX={contact.photoOffsetX ?? 0}
          offsetY={contact.photoOffsetY ?? 0}
        />
      ) : (
        <span className="font-voice text-lg text-lilac-soft">{contact.firstName.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

function SocialIcons({ socials }: { socials: SocialsMap }) {
  const links = SOCIAL_PLATFORMS.map((platform) => {
    const value = socials[platform.key];
    const url = value ? buildSocialUrl(platform.base, value) : null;
    return url ? { ...platform, url } : null;
  }).filter((entry): entry is (typeof SOCIAL_PLATFORMS)[number] & { url: string } => entry !== null);

  return (
    <>
      {links.map(({ key, label, Icon, url }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="text-muted transition-colors hover:text-lilac-soft"
        >
          <Icon size={14} />
        </a>
      ))}
    </>
  );
}
