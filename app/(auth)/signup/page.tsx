import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
import { SignupForm } from "@/components/auth/signup-form";
import { getT } from "@/lib/i18n/server";
import { stageAdminSeats } from "@/lib/stage-admins";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).auth.signup;
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function SignupPage() {
  const t = (await getT()).auth.signup;
  // How many of each stage's two stage admin seats are taken (0024).
  const seats = await stageAdminSeats();
  return (
    <>
      <AuthIntro title={t.title}>
        {t.intro}
      </AuthIntro>

      <SignupForm seats={seats} />
    </>
  );
}
