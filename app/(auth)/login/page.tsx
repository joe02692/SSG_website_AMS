import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
import { LoginForm } from "@/components/auth/login-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getT()).auth.login;
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function LoginPage({
  searchParams,
}: {
  // In Next.js 16 searchParams is a Promise — synchronous access was removed.
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;
  const t = (await getT()).auth.login;
  const messages: Record<string, string> = {
    invalid_confirmation_link: t.invalidLink,
    confirmation_failed: t.linkFailed,
    confirmed_sign_in: t.confirmedSignIn,
  };
  const notice = error ? messages[error] : undefined;

  return (
    <>
      <AuthIntro title={t.title}>
        {t.intro}
      </AuthIntro>

      {notice ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-warning-line bg-warning-surface px-3 py-2.5 text-sm text-warning-ink"
        >
          {notice}
        </p>
      ) : null}

      <LoginForm redirectTo={redirectTo} />
    </>
  );
}
