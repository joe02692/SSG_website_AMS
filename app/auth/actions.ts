"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SELF_SERVE_ROLES } from "@/lib/roles";

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
  if (!isSelfServe && requestedRole !== "leader") {
    fieldErrors.role = "Choose how you're joining.";
  }
  if (requestedRole === "leader" && !inviteCode) {
    fieldErrors.inviteCode = "Leader accounts need an invite code.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "Please fix the highlighted fields." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        full_name: fullName,
        // Named "requested_" on purpose: it is a hint the database trigger
        // may override. It is never the authoritative role.
        requested_role: isSelfServe ? requestedRole : "scout",
        ...(inviteCode ? { leader_invite_code: inviteCode } : {}),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmation enabled (the Supabase default) there is no
  // session yet, so we tell them to check their inbox rather than redirect.
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
