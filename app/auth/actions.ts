"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COMING_SOON_ROLES, SELF_SERVE_ROLES } from "@/lib/roles";

export type AuthState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Only allow relative, single-slash paths as post-login destinations.
 * Blocks `//evil.com` and `https://evil.com` open-redirects.
 */
function safeRedirect(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------
export async function signUpAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const fullName = str(formData, "fullName");
  const requestedRole = str(formData, "role");
  const inviteCode = str(formData, "inviteCode");

  const fieldErrors: Record<string, string> = {};

  if (!fullName) fieldErrors.fullName = "Please enter your full name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  // "leader" is deliberately absent from SELF_SERVE_ROLES. A leader signup is
  // only ever the result of a valid invite code, and the decision is made in
  // Postgres (handle_new_user), not here — this check is just good UX.
  const isSelfServe = (SELF_SERVE_ROLES as readonly string[]).includes(
    requestedRole,
  );
  const isComingSoon = (COMING_SOON_ROLES as readonly string[]).includes(
    requestedRole,
  );

  // The radio for these is disabled in the UI, but that's only a hint — a
  // crafted POST straight to this action would sail past it.
  if (isComingSoon) {
    fieldErrors.role =
      "Parent accounts aren't open yet. Please check back soon.";
  } else if (!isSelfServe && requestedRole !== "leader") {
    fieldErrors.role = "Choose how you're joining.";
  }
  // Codes are generated in upper case; accept whatever case is typed.
  const normalisedCode = inviteCode.toUpperCase();

  const supabase = await createClient();

  if (requestedRole === "leader") {
    if (!normalisedCode) {
      fieldErrors.inviteCode = "Leader accounts need an invite code.";
    } else {
      // Check the code BEFORE creating anything. Without this the account is
      // created first and the database trigger rejects it, which works but
      // gives the person a failed request instead of a clear message.
      const { data: valid } = await supabase.rpc("invite_code_is_valid", {
        code: normalisedCode,
      });
      if (!valid) {
        fieldErrors.inviteCode =
          "That code isn't valid — it may be mistyped, expired, or already used.";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }

  const origin = (await headers()).get("origin") ?? "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        full_name: fullName,
        // Named "requested_" on purpose: it is a hint the database trigger
        // may override. It is never the authoritative role.
        requested_role: isSelfServe ? requestedRole : "scout",
        ...(normalisedCode ? { leader_invite_code: normalisedCode } : {}),
      },
    },
  });

  if (error) {
    // The trigger raises when a code is unusable. That normally can't happen
    // — it was checked a moment ago — but it does if someone else redeems the
    // last-but-one use in between, so translate it rather than showing a raw
    // database error.
    const message = `${error.message} ${error.code ?? ""}`;
    if (
      message.includes("ELSALAM_INVALID_INVITE") ||
      message.includes("Database error saving new user")
    ) {
      return {
        fieldErrors: {
          inviteCode:
            "That code was just used or is no longer valid. Ask for a new one.",
        },
        error: "Please fix the highlighted fields.",
      };
    }
    return { error: error.message };
  }

  // When "Confirm email" is switched off in the Supabase dashboard, signUp
  // returns a live session — send them straight in rather than to a mailbox
  // that will never receive anything.
  if (data.session) {
    revalidatePath("/", "layout");
    // redirect() throws a control-flow exception; nothing after it runs.
    redirect("/dashboard");
  }

  // Note: Supabase returns a user with an empty `identities` array when the
  // address is already registered, rather than erroring — deliberately, so
  // the endpoint can't be used to discover which emails have accounts. We
  // mirror that by showing the same message either way.
  return {
    notice:
      "Account created. Check your email for a confirmation link to finish signing in.",
  };
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------
export async function signInAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const redirectTo = safeRedirect(str(formData, "redirectTo") || null);

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Deliberately vague: don't reveal whether the address is registered.
    return { error: "Those details don't match an account." };
  }

  revalidatePath("/", "layout");
  // redirect() throws a control-flow exception — it must not sit inside a
  // try/catch, and nothing after it runs.
  redirect(redirectTo);
}

// ---------------------------------------------------------------------------
// Password reset — step 1: request the email
// ---------------------------------------------------------------------------
export async function requestPasswordResetAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData, "email").toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";

  // After the user clicks the emailed link, /auth/confirm exchanges the
  // recovery code for a session and forwards them to /reset-password.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Deliberately identical whether or not the address has an account —
  // this endpoint must not let anyone probe which emails are registered.
  return {
    notice:
      "If that address has an account, a reset link is on its way. Check your inbox (and spam folder).",
  };
}

// ---------------------------------------------------------------------------
// Password reset — step 2: set the new password
// ---------------------------------------------------------------------------
export async function updatePasswordAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = str(formData, "password");
  const confirm = str(formData, "confirmPassword");

  const fieldErrors: Record<string, string> = {};
  if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (confirm !== password) {
    fieldErrors.confirmPassword = "The passwords don't match.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }

  const supabase = await createClient();

  // The recovery link signed them in; no session means the link expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Your reset link has expired or was already used. Request a new one from the sign-in page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?pw=updated");
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
