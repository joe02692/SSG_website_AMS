import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation landing point.
 *
 * Handles BOTH confirmation styles, because Supabase's default email
 * service doesn't allow editing the template (that needs custom SMTP):
 *
 * 1. `?code=...` — what the default `{{ .ConfirmationURL }}` email produces
 *    with the PKCE flow @supabase/ssr uses. We exchange the code for a
 *    session here on the server.
 * 2. `?token_hash=...&type=...` — the customized-template flow, kept for
 *    when custom SMTP is set up later.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(destination, origin));
    }
    // The verify endpoint only issues a code after confirming the email, so
    // reaching here usually means the link was opened in a different browser
    // than the one that signed up (the PKCE verifier cookie is missing).
    // The email IS confirmed — they just need to sign in manually.
    return NextResponse.redirect(
      new URL("/login?error=confirmed_sign_in", origin),
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(destination, origin));
    }
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", origin),
    );
  }

  return NextResponse.redirect(
    new URL("/login?error=invalid_confirmation_link", origin),
  );
}
