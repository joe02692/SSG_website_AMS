import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).auth.forgot;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = (await getT()).auth.forgot;
  return (
    <>
      <AuthIntro title={t.title}>
        {t.intro}
      </AuthIntro>

      <ForgotPasswordForm />
    </>
  );
}
