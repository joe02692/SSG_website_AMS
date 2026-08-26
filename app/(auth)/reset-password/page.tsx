import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default async function ResetPasswordPage() {
  // Reached with the temporary session the recovery link created (or by a
  // normally signed-in member changing their password). No session at all
  // means an expired link — requireUser sends them to /login.
  await requireUser();

  return (
    <div className="rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Set a new password
        </h1>
        <p className="text-sm text-ink-muted">
          Choose a new password for your account. You&apos;ll stay signed in
          after saving it.
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
