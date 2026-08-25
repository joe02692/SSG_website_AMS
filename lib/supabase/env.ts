/**
 * Centralised, fail-loud access to the Supabase environment variables.
 *
 * These two are NEXT_PUBLIC_* on purpose: the anon key is designed to be
 * shipped to the browser, and it is only safe because Row Level Security
 * is enforced in the database. Never put the service_role key here.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local (and to your Vercel project settings).`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
