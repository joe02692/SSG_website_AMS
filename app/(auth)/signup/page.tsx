import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
import { SignupForm } from "@/components/auth/signup-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).auth.signup;
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function SignupPage() {
  const t = (await getT()).auth.signup;
  return (
    <>
      <AuthIntro title={t.title}>
        {t.intro}
      </AuthIntro>

      <SignupForm />
    </>
  );
}
