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
