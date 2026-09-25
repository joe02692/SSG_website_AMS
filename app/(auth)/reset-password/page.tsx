import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
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
    <>
      <AuthIntro title="Set a new password">
          Choose a new password for your account. You&apos;ll stay signed in
          after saving it.
      </AuthIntro>

      <ResetPasswordForm />
    </>
  );
}
