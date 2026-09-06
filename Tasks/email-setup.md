# Email — Resend setup

Two separate jobs, and only one of them needs code.

| | What it sends | How it's wired |
|---|---|---|
| **Auth emails** | Confirm signup, password reset | Supabase → SMTP settings. **No code.** |
| **Admin notifications** | "X finished registering" | `lib/email.ts`, already written |

Both depend on one thing: **a domain you can add DNS records to.**

## Why a domain is not optional

Resend's test sender, `onboarding@resend.dev`, can only deliver to the email
address on your own Resend account. Anything else comes back 403: *"You can
only send testing emails to your own email address."*

That is the same wall the built-in Supabase mailer put us behind, so wiring up
Resend without a domain changes nothing. `*.vercel.app` does not qualify —
Vercel owns that zone and you cannot add the TXT and MX records verification
needs.

Free tier once the domain is verified: **3,000 emails a month, 100 a day,
3 domains.** For ~400 members that is comfortable.

## Interim, with no domain yet

Half of this works today.

**Admin notifications: yes.** They go to one recipient — you — and Resend's
test sender is allowed to reach the address on your own Resend account. So:

- Sign up at resend.com with the address you want the notifications at
  (`joeelbasiouny@gmail.com`). This matters: the restriction is specifically
  "your own account email", not "any address you like".
- Create an API key. No domain, no card.
- Set the three variables, using the test sender:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
ADMIN_NOTIFICATION_EMAILS=joeelbasiouny@gmail.com
```

- Redeploy. Register a test account; the email should arrive.

Add a second admin to `ADMIN_NOTIFICATION_EMAILS` and **that one silently
fails** — Resend refuses the whole send with a 403. Vercel's Runtime Logs will
show it as `[email] Resend refused the send (HTTP 403)`. One recipient until
the domain exists.

**Auth emails: no.** Confirm-signup and password-reset go to members, not to
you, so the test sender cannot deliver them. That half genuinely waits for the
domain, and so does re-enabling "Confirm email".

Everything below is what to do once the domain is bought — the switch from the
test sender is one env var.

## Password reset while there is no mailer

`/members` has a **Reset password** button next to each member (head site admin
only). It mints a one-time recovery link that you send to the person however
you already talk to them — WhatsApp, in person. Without it, a member who
forgets their password has no route back into their account at all, because
the reset email cannot reach them.

- **A link, not a password.** No admin ever learns a member's credentials, and
  the link expires on its own after one use. Setting temporary passwords means
  someone knows them, and those get reused and pasted into group chats.
- **Shown once.** It is never stored or logged. Need it again? Issue a new one.
- **Head admin only**, and it refuses to issue a link for another head admin —
  the same guard as account deletion.
- **Keep it after the domain arrives.** Someone who mistyped their email, or
  whose address bounces, still needs a way in.

Needs `SUPABASE_SERVICE_ROLE_KEY` set on the deployment. It says so plainly if
that is missing rather than 500ing.

## So you should do

### 1. Buy a domain

Something like `elsalamscouts.org`. Roughly $10–15 a year. Egyptian
registrars commonly accept Fawry, Vodafone Cash or Meeza rather than a card,
which matters here.

Worth noting it buys more than email: the site stops being
`ssg-website-ams-git-main-ssg-it.vercel.app` and becomes something a parent can
type, and Vercel will serve it for free.

### 2. Verify it in Resend

- resend.com → sign up (free, no card) → **Domains → Add Domain**
- Resend shows a set of DNS records — a TXT for DKIM, an MX and TXT for the
  return path, and optionally DMARC
- Add them at your registrar, exactly as shown
- Wait for all rows to go green. Usually minutes; DNS can take hours

### 3. Point Supabase at Resend — this fixes signup and password reset

Supabase → **Project Settings → Authentication → SMTP Settings** → enable
custom SMTP:

```
Host:        smtp.resend.com
Port:        465
Username:    resend
Password:    <your Resend API key>
Sender email: noreply@yourdomain.org
Sender name:  El-Salam Scouting Group
```

Then **Authentication → Sign In / Providers → Email → turn "Confirm email"
back on.** It has been off since development because the built-in mailer was
unusable, which means anyone can currently register with an address they don't
own. That is the launch blocker in `claude/backend-roadmap.md`.

Finally, check **Authentication → URL Configuration** still lists your new
domain in Site URL and Redirect URLs, or confirmation links will bounce to the
wrong place.

### 4. Add three variables for the admin notifications

In `.env.local` and in Vercel → Settings → Environment Variables:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=El-Salam Scouting Group <noreply@yourdomain.org>
ADMIN_NOTIFICATION_EMAILS=joeelbasiouny@gmail.com
```

`ADMIN_NOTIFICATION_EMAILS` is comma-separated for several admins.
`EMAIL_FROM` must be on the verified domain — anything else is refused.

Then redeploy.

### 5. Test it

Register a test account. You should get an email saying someone completed
registration. Nothing arrives? Check Vercel → Runtime Logs for a line starting
`[email]` — it carries Resend's own explanation.

## What the notification deliberately does not contain

A name, a role, and a link to the roster. **No addresses, phone numbers,
national IDs or documents.**

That is a decision, not an oversight. Email is unencrypted between servers, it
sits in inboxes for years, and it gets forwarded without thought. The roster is
behind a login because it holds children's identity details; an email quoting
those details hands them to anyone who ever reads that mailbox. The link makes
an admin log in to see them, which is the point.

## Behaviour when it isn't configured

`lib/email.ts` no-ops if any of the three variables is missing, and never
throws. A failing or misconfigured mailer cannot turn a successful
registration into an error — it logs and moves on. Verified against a missing
config, a 403 from Resend, and a dead network.

Sending happens inside Next's `after()`, so it runs once the response has
already gone to the member. A slow Resend never delays anyone finishing
registration.
