import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Forgot your password?
        </h1>
        <p className="text-sm text-ink-muted">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
