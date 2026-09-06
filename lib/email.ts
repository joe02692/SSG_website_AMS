import "server-only";

/**
 * Outbound email via Resend.
 *
 * Plain fetch, no SDK — same as lib/cloudinary.ts. One less dependency to
 * install, one less lockfile to keep in sync, and the API is three fields.
 *
 * Two rules this module exists to enforce:
 *
 *  1. **It never throws.** Every caller is on a path where a member is
 *     finishing registration. An email failing must never turn a successful
 *     registration into an error message. Failures are logged and swallowed.
 *
 *  2. **It never sends personal data.** Notifications say who registered and
 *     link to the roster; they do not carry addresses, phone numbers, national
 *     IDs or documents. Email is unencrypted in transit between servers, it
 *     sits in inboxes for years, and it gets forwarded. The roster is behind a
 *     login for a reason — an email that quotes it hands that data to anyone
 *     who ever reads the mailbox.
 */

const ENDPOINT = "https://api.resend.com/emails";

type Config = {
  apiKey: string;
  from: string;
  to: string[];
};

function config(): Config | null {
  const apiKey = process.env.RESEND_API_KEY;
  // Must be an address on the domain verified in Resend. Anything else is
  // rejected, and onboarding@resend.dev can only reach your own account.
  const from = process.env.EMAIL_FROM;
  const to = (process.env.ADMIN_NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (!apiKey || !from || to.length === 0) return null;
  return { apiKey, from, to };
}

/** True when Resend is configured for admin notifications. */
export function emailConfigured(): boolean {
  return config() !== null;
}

/**
 * Sends one notification to the admin list. Resolves either way.
 *
 * `idempotencyKey` guards against the double-sends that a retried Server
 * Action or a double-clicked submit would otherwise produce.
 */
async function notifyAdmins(
  subject: string,
  lines: string[],
  idempotencyKey: string,
): Promise<void> {
  const settings = config();
  if (!settings) return; // Not configured — silently do nothing.

  const text = lines.join("\n");
  const html = lines
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br>"))
    .join("\n");

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: settings.from,
        to: settings.to,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      // Read the body: Resend explains refusals properly, and a swallowed
      // reason here is how a silently-not-sending mailer goes unnoticed for
      // weeks.
      const detail = await response.text().catch(() => "");
      console.error(
        `[email] Resend refused the send (HTTP ${response.status})`,
        detail.slice(0, 400),
      );
    }
  } catch (cause) {
    console.error("[email] could not reach Resend", cause);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * "Someone finished registering."
 *
 * Deliberately thin: a name, a role, and a link. Everything an admin actually
 * needs to decide whether to go and look is here; everything sensitive stays
 * behind the login.
 */
export async function notifyRegistrationComplete(input: {
  fullName: string | null;
  roleLabel: string;
  profileId: string;
}): Promise<void> {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ssg-website-ams.vercel.app";
  const who = input.fullName?.trim() || "A new member";

  await notifyAdmins(
    `New registration — ${who} (${input.roleLabel})`,
    [
      `${who} has completed registration as a ${input.roleLabel}.`,
      "",
      `See the roster: ${site}/members/scouts`,
      "",
      "This message deliberately contains no personal details — open the roster to see them.",
    ],
    // One notification per member per completion, not per retry.
    `registration-${input.profileId}`,
  );
}
