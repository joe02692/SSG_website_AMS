import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the El-Salam Scouting Group members area.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_confirmation_link:
    "That confirmation link was incomplete. Please request a new one.",
  confirmation_failed:
    "That confirmation link has expired or has already been used.",
};

export default async function LoginPage({
  searchParams,
}: {
  // In Next.js 16 searchParams is a Promise — synchronous access was removed.
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;
  const notice = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Welcome back
        </h1>
        <p className="text-sm text-ink-muted">
          Sign in to reach your section, records and camp bookings.
        </p>
      </div>

      {notice ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
        >
          {notice}
        </p>
      ) : null}

      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
