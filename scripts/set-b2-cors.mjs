/**
 * Applies the CORS rule that lets browsers upload birth certificates to B2.
 *
 *   node scripts/set-b2-cors.mjs
 *
 * Why this exists as a script rather than a line in the setup guide: the
 * Backblaze web console can only apply its canned rules, and those are
 * download-only — they allow GET and HEAD, not PUT. A bucket with "share
 * everything with all HTTPS origins" ticked still refuses browser uploads, and
 * the failure looks like a missing rule rather than an incomplete one. Custom
 * rules have to come from an API, so here it is.
 *
 * Reads B2_* from .env.local. Nothing is sent anywhere except Backblaze, and
 * no credential is printed.
 */

import { readFileSync } from "node:fs";

// Imported dynamically so a missing install produces a sentence rather than a
// module-resolution stack trace. Vercel installs from package.json on every
// build, so the deployed site can have this package while a laptop that hasn't
// run npm install since it was added does not — and the failure then looks
// like a broken script instead of a missing dependency.
let GetBucketCorsCommand, PutBucketCorsCommand, S3Client;
try {
  ({ GetBucketCorsCommand, PutBucketCorsCommand, S3Client } = await import(
    "@aws-sdk/client-s3"
  ));
} catch {
  console.error(
    "The AWS SDK isn't installed here.\n\n  Run:  npm install\n\nThen try this script again.",
  );
  process.exit(1);
}

/** Origins allowed to upload. Override with B2_CORS_ORIGINS (comma-separated). */
const DEFAULT_ORIGINS = [
  "https://ssg-website-ams.vercel.app",
  "https://ssg-website-ams-git-main-ssg-it.vercel.app",
  "http://localhost:3000",
];

// Minimal .env.local reader — this runs before Next, so there is no loader yet.
function loadEnvLocal() {
  let text;
  try {
    text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

loadEnvLocal();

const required = ["B2_KEY_ID", "B2_APP_KEY", "B2_BUCKET", "B2_ENDPOINT", "B2_REGION"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing ${missing.join(", ")}. Add them to .env.local first.`);
  process.exit(1);
}

const bucket = process.env.B2_BUCKET;
const origins = (process.env.B2_CORS_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = origins.length > 0 ? origins : DEFAULT_ORIGINS;

const client = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const rule = {
  AllowedOrigins: allowedOrigins,
  // PUT is the upload. HEAD and GET cover viewing and the bulk download.
  // DELETE lets a replaced certificate clean up the file it superseded.
  AllowedMethods: ["GET", "HEAD", "PUT", "DELETE"],
  // "*" matters more than it looks. The upload sends Content-Type: image/jpeg,
  // which is not on the browser's safelist, so a preflight goes out first and
  // is refused unless content-type is allowed. Operations without headers is
  // the near-miss that wastes an afternoon.
  AllowedHeaders: ["*"],
  ExposeHeaders: ["ETag"],
  MaxAgeSeconds: 3600,
};

console.log(`Bucket:  ${bucket}`);
console.log(`Origins: ${allowedOrigins.join("\n         ")}`);

try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: [rule] },
    }),
  );
} catch (error) {
  const status = error.$metadata?.httpStatusCode;
  console.error("\nCould not set the CORS rule.");
  console.error(`  ${error.name}: ${error.message}`);
  if (status) console.error(`  HTTP ${status}`);

  // The SDK sometimes reports a Backblaze error as an XML parse failure,
  // because the body isn't the shape it expected. The body is the useful part.
  const body = error.$response?.body;
  if (body && typeof body.transformToString === "function") {
    const raw = await body.transformToString().catch(() => "");
    if (raw) console.error(`  response: ${raw.slice(0, 500)}`);
  }

  if (status === 401 || status === 403 || error.name === "AccessDenied") {
    console.error(
      "\nMost likely the application key isn't allowed to change bucket settings.\n" +
        "Create a key with access to ALL buckets (or use the master key), put it in\n" +
        ".env.local just long enough to run this once, then put the scoped key back.",
    );
  }
  process.exit(1);
}

// Read it back: a write that reports success and a rule that is actually in
// place are different claims, and only the second one matters.
const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));

console.log("\nApplied. Backblaze now reports:");
for (const applied of current.CORSRules ?? []) {
  console.log(`  methods: ${(applied.AllowedMethods ?? []).join(", ")}`);
  console.log(`  headers: ${(applied.AllowedHeaders ?? []).join(", ")}`);
  console.log(`  origins: ${(applied.AllowedOrigins ?? []).join(", ")}`);
}
console.log("\nChanges take about a minute. Then retry the upload.");
