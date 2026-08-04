import { Resend } from "resend";

// Constructed lazily (not at module load) so a missing RESEND_API_KEY only
// breaks email sending at request time, not the entire build -- Next.js
// imports every API route during `next build` to collect page data, and an
// eager `new Resend(...)` at module scope would throw during that import.
let resendClient: Resend | null = null;
function resend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const KIND_LABELS: Record<"member" | "interview" | "collab", string> = {
  member: "Membership application",
  interview: "Interview request",
  collab: "Author partnership",
};

export async function sendApplicationNotification(params: {
  kind: "member" | "interview" | "collab";
  fullName: string;
  email: string;
}) {
  const { kind, fullName, email } = params;

  // Notify leadership
  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.NOTIFY_EMAIL!,
    subject: `New ${KIND_LABELS[kind]}: ${fullName}`,
    text: `${fullName} (${email}) just submitted a ${KIND_LABELS[kind].toLowerCase()}. Review it in the Supabase dashboard.`,
  });

  // Confirmation to the applicant
  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "We received your submission: The Moonlit Margins Sisterhood",
    text: `Hi ${fullName},\n\nThanks for reaching out to The Moonlit Margins Sisterhood. We received your ${KIND_LABELS[kind].toLowerCase()} and someone from our team will follow up soon.\n\nWith love,\nThe Moonlit Margins Sisterhood`,
  });
}

export async function sendRsvpNotification(params: {
  eventTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  startsAt: string;
}) {
  const { eventTitle, firstName, lastName, email, startsAt } = params;
  const when = new Date(startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  // Notify leadership
  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.NOTIFY_EMAIL!,
    subject: `New RSVP: ${eventTitle}`,
    text: `${firstName} ${lastName} (${email}) just RSVP'd for "${eventTitle}" on ${when}.`,
  });

  // Confirmation to the guest
  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `You're on the list: ${eventTitle}`,
    text: `Hi ${firstName},\n\nYou're confirmed for "${eventTitle}" on ${when}. We'll see you there!\n\nWith love,\nThe Moonlit Margins Sisterhood`,
  });
}

export async function sendMessageNotification(params: {
  recipientEmail: string;
  senderName: string;
  conversationLabel: string;
  body: string;
}) {
  const { recipientEmail, senderName, conversationLabel, body } = params;

  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: recipientEmail,
    subject: `New message from ${senderName}`,
    text: `${senderName} sent a message in ${conversationLabel}:\n\n"${body}"\n\nReply in the admin panel under Messages.`,
  });
}

/**
 * Newsletter signups notify a specific address (Kaya's) rather than the
 * general NOTIFY_EMAIL used for applications/RSVPs -- a deliberate,
 * separate recipient per Dean's request.
 */
export async function sendNewsletterSignupNotification(email: string) {
  const notifyEmail = process.env.NEWSLETTER_NOTIFY_EMAIL;
  if (!notifyEmail) return; // Optional -- silently skip if not configured.

  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: notifyEmail,
    subject: "New newsletter signup",
    text: `${email} just signed up for the Moonlit Margins Sisterhood newsletter.`,
  });
}

/**
 * Sent once, right after an application is accepted (see
 * applications/[id]/route.ts), inviting the new member to set up her own
 * portal login. NOTE: this depends on Resend actually being configured
 * with a verified sending domain -- until then, this send fails
 * silently like every other best-effort email in this file (the caller
 * never lets a failed send block the acceptance itself), so no invite
 * will actually arrive even though the token/expiry are still set
 * correctly in the database.
 */
export async function sendPortalSetupInviteEmail(params: { recipientEmail: string; fullName: string; setupUrl: string }) {
  const { recipientEmail, fullName, setupUrl } = params;

  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: recipientEmail,
    subject: "Set up your Moonlit Margins Sisterhood portal account",
    text: `Hi ${fullName},\n\nWelcome to The Moonlit Margins Sisterhood! Click below to set up your portal account and choose a password:\n\n${setupUrl}\n\nOnce you're in, you'll find a short orientation checklist to complete with guidance from your mentor. After that, you'll have full access to the portal, including the member Contacts directory and our Reviews tool.\n\nThis link expires in 72 hours.\n\nWith love,\nThe Moonlit Margins Sisterhood`,
  });
}

/**
 * Sent to members in a private event's targeted tiers when the event is
 * created. Members have no login of their own, so this email itself is
 * how they actually find out about a private event.
 */
export async function sendPrivateEventInviteEmail(params: {
  recipientEmail: string;
  eventTitle: string;
  startsAt: string;
  location: string | null;
  description: string | null;
}) {
  const { recipientEmail, eventTitle, startsAt, location, description } = params;
  const when = new Date(startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: recipientEmail,
    subject: `You're invited: ${eventTitle}`,
    text: `You've been invited to a private sisterhood event.\n\n${eventTitle}\n${when}${location ? `\n${location}` : ""}${description ? `\n\n${description}` : ""}\n\nThis one's just for us -- keep the details close.`,
  });
}

/**
 * Sent to a member's assigned mentor (an admin_users row) when she sends a
 * check-in update from the portal orientation page. See
 * api/portal/orientation/check-in/route.ts for why this goes straight to
 * push+email rather than through the conversations/messages system --
 * members aren't admin_users and have no way to be a message sender there.
 */
export async function sendOrientationCheckInEmail(params: {
  recipientEmail: string;
  mentorName: string;
  memberName: string;
  message: string;
}) {
  const { recipientEmail, mentorName, memberName, message } = params;

  await resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: recipientEmail,
    subject: `${memberName} checked in during orientation`,
    text: `Hi ${mentorName},\n\n${memberName} just sent a check-in update during orientation:\n\n"${message}"\n\nFollow up with her however feels right -- this note doesn't reply anywhere, so reach out directly.`,
  });
}
