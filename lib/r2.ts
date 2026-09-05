/**
 * Cloudflare R2 support was removed.
 *
 * It required a credit card to sign up, and on reflection it was the wrong
 * trade anyway: moving off Supabase Storage meant giving up database-enforced
 * access control (an RLS policy that refuses a bad read even if the app has a
 * bug) in exchange for storage headroom we don't actually need — automatic
 * expiry keeps the bucket small enough for the free tier.
 *
 * Certificates live in Supabase Storage. See Tasks/document-storage.md.
 */

export {};
