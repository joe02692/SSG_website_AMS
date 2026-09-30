import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
import { requireUser } from "@/lib/dal";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).auth.reset;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false } };
}

export default async function ResetPasswordPage() {
  // Reached with the temporary session the recovery link created (or by a
  // normally signed-in member changing their password). No session at all
  // means an expired link — requireUser sends them to /login.
  await requireUser();
  const t = (await getT()).auth.reset;

  return (
    <>
      <AuthIntro title={t.title}>
        {t.intro}
      </AuthIntro>

      <ResetPasswordForm />
    </>
  );
}
