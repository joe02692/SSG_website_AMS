import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthIntro title="Forgot your password?">
          Enter your email and we&apos;ll send you a link to set a new one.
      </AuthIntro>

      <ForgotPasswordForm />
    </>
  );
}
