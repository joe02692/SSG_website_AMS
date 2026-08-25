import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation landing point.
 *
 * This is one of the few places a Route Handler is the right tool: Supabase
 * redirects the browser here from the confirmation email, so we need a plain
 * GET endpoint rather than a Server Action.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_confirmation_link", origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", origin),
    );
  }

  return NextResponse.redirect(new URL(destination, origin));
}
