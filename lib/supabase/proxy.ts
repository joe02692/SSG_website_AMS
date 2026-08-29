import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Route prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/members",
  "/admin",
  "/reset-password",
  "/onboarding",
] as const;

/** Auth pages a signed-in user should be bounced away from. */
const AUTH_PAGES = ["/login", "/signup"] as const;

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth token on every matched request and performs
 * an *optimistic* redirect for unauthenticated visitors.
 *
 * Optimistic is the operative word: this is a convenience redirect, not the
 * security boundary. Real authorisation happens in the Data Access Layer
 * (lib/dal.ts) and in Postgres RLS, close to the data.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        // @supabase/ssr hands us the no-store headers that must accompany
        // any response setting auth cookies, so a CDN can never hand one
        // member's session token to another.
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token with the Supabase auth server.
  // getSession() only decodes the cookie and is trivially spoofable — never
  // use it to make an access decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const redirect = NextResponse.redirect(url);
    // Carry the refreshed auth cookies onto the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  if (user && isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  }

  // Must be returned as-is. Constructing a fresh NextResponse here would
  // drop the refreshed cookies and log members out at random.
  return supabaseResponse;
}
