/**
 * Applies the CORS rule that lets browsers upload birth certificates to B2.
 *
 *   node scripts/set-b2-cors.mjs
 *
 * Why a script and not a click in the console: all four of the console's CORS
 * options write the same rule, whose operations are b2_download_file_by_id and
 * b2_download_file_by_name. There is no upload operation in it. Selecting
 * "share everything with all HTTPS origins" and applying it to "Both" APIs
 * therefore still refuses every browser upload — and refuses it by omitting the
 * CORS headers entirely, so the browser reports it exactly as if no rule had
 * ever been set. The console cannot express what we need.
 *
 * Uses the B2 *native* API. The S3 PutBucketCors call refuses any bucket that
 * already holds native rules ("The bucket contains B2 Native CORS rules"), and
 * the console's rule is native — so once those radio buttons have been touched
 * even once, this is the only route left.
 *
 * No dependencies: plain fetch, so it runs whether or not npm install has.
 * Reads B2_* from .env.local. No credential is printed.
 */

import { readFileSync } from "node:fs";

/** Origins allowed to upload. Override with B2_CORS_ORIGINS (comma-separated). */
const DEFAULT_ORIGINS = [
  "https://ssg-website-ams.vercel.app",
  "https://ssg-website-ams-git-main-ssg-it.vercel.app",
  "http://localhost:3000",
];

/**
 * Every operation name worth offering, most wanted first.
 *
 * Deliberately a superset rather than the exact list, because Backblaze's
 * published documentation and its API disagree: the docs give `s3_put_object`,
 * the API answers "unknown allowedOperation value: s3_put_object". Rather than
 * pick a side, send everything plausible and let the API strike out what it
 * doesn't recognise — see applyRule(). Whatever the current spelling is, one of
 * these matches it, and the script keeps working after Backblaze renames
 * anything.
 */
const CANDIDATE_OPERATIONS = [
  "s3_put",
  "s3_get",
  "s3_head",
  "s3_delete",
  "s3_put_object",
  "s3_get_object",
  "s3_head_object",
  "s3_delete_object",
  "b2_upload_file",
  "b2_upload_part",
  "b2_download_file_by_id",
  "b2_download_file_by_name",
];

/** An operation that can carry a file up. At least one must survive. */
const UPLOAD_PATTERN = /put|upload/i;

/** Thrown to stop with a message. Never process.exit() — see the note below. */
class Abort extends Error {}

function fail(message) {
  throw new Abort(message);
}

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

async function post(url, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text.slice(0, 400) };
  }
  return { ok: response.ok, status: response.status, data };
}

/**
 * Authorises against whichever API version this account answers on.
 *
 * Never swallows the reason. An authorisation step that fails with "it didn't
 * work" is worse than useless — the status and body are the whole diagnosis.
 */
async function authorize(keyId, appKey) {
  const basic = Buffer.from(`${keyId}:${appKey}`).toString("base64");
  const attempts = [];

  for (const version of ["v4", "v3"]) {
    let response;
    try {
      response = await fetch(
        `https://api.backblazeb2.com/b2api/${version}/b2_authorize_account`,
        { headers: { Authorization: `Basic ${basic}` } },
      );
    } catch (cause) {
      attempts.push(`  ${version}: could not connect — ${cause.message}`);
      continue;
    }

    const text = await response.text();
    if (response.ok) {
      try {
        return { version, data: JSON.parse(text) };
      } catch {
        attempts.push(`  ${version}: HTTP 200 but the body wasn't JSON`);
        continue;
      }
    }

    attempts.push(`  ${version}: HTTP ${response.status} — ${text.slice(0, 200)}`);

    if (response.status === 401) {
      fail(
        `Backblaze rejected the key.\n${attempts.join("\n")}\n\n` +
          "Check B2_KEY_ID and B2_APP_KEY in .env.local. The application key is\n" +
          "shown only once when it's created — if it wasn't saved, make a new one.",
      );
    }
  }

  fail(`Could not authorise with Backblaze.\n${attempts.join("\n")}`);
}

/**
 * Finds the bucket's id. Where it lives moved between API versions — v3 put it
 * at apiInfo.storageApi.bucketId, v4 moved to a list of allowed buckets — so
 * look in every known place before falling back to asking.
 */
async function resolveBucketId(auth, bucketName) {
  const storage = auth.data.apiInfo?.storageApi ?? {};
  const wanted = bucketName.toLowerCase();

  const candidates = [
    ...(storage.buckets ?? []),
    ...(storage.allowed?.buckets ?? []),
    ...(auth.data.allowed?.buckets ?? []),
  ];
  for (const bucket of candidates) {
    const name = bucket.name ?? bucket.bucketName;
    const id = bucket.id ?? bucket.bucketId;
    if (id && (!name || name.toLowerCase() === wanted)) return id;
  }

  if (storage.bucketId) return storage.bucketId;
  if (auth.data.allowed?.bucketId) return auth.data.allowed.bucketId;

  const listed = await post(
    `${storage.apiUrl}/b2api/${auth.version}/b2_list_buckets`,
    auth.data.authorizationToken,
    { accountId: auth.data.accountId, bucketName },
  );
  if (!listed.ok) {
    fail(
      `Could not look up the bucket (HTTP ${listed.status}).\n` +
        `  ${listed.data.code ?? ""} ${listed.data.message ?? ""}`,
    );
  }
  const found = (listed.data.buckets ?? []).find(
    (bucket) => bucket.bucketName?.toLowerCase() === wanted,
  );
  if (!found) fail(`No bucket named "${bucketName}" on this account.`);
  return found.bucketId;
}

/**
 * Writes the rule, dropping any operation Backblaze doesn't recognise.
 *
 * The API rejects the whole request naming one bad value at a time, so this
 * removes that value and tries again. Ten or so rounds is far more than the
 * candidate list can need, and the bound means a changed error message turns
 * into a clear failure rather than a spin.
 */
async function applyRule(auth, bucketId, url, origins) {
  let operations = [...CANDIDATE_OPERATIONS];
  const rejected = [];

  for (let round = 0; round < CANDIDATE_OPERATIONS.length + 2; round += 1) {
    if (operations.length === 0) {
      fail("Backblaze rejected every operation name this script knows about.");
    }

    const result = await post(url, auth.data.authorizationToken, {
      accountId: auth.data.accountId,
      bucketId,
      corsRules: [
        {
          // Letters, digits and hyphens; 6–63 chars; must not start with "b2-".
          corsRuleName: "ssgBrowserUploads",
          allowedOrigins: origins,
          allowedOperations: operations,
          // "*" matters as much as the operations do. The upload sends
          // Content-Type: image/jpeg, which is not on the browser's safelist,
          // so a preflight OPTIONS goes first and is refused unless
          // content-type is allowed. Operations without headers is the
          // near-miss that costs an afternoon.
          allowedHeaders: ["*"],
          exposeHeaders: ["etag"],
          maxAgeSeconds: 3600,
        },
      ],
    });

    if (result.ok) return { data: result.data, operations, rejected };

    const unknown = /unknown allowedOperation value:\s*(\S+)/i.exec(
      result.data.message ?? "",
    );
    if (!unknown) {
      fail(
        `Could not set the CORS rule (HTTP ${result.status}).\n` +
          `  ${result.data.code ?? ""} ${result.data.message ?? ""}`,
      );
    }

    const name = unknown[1].replace(/[.,]$/, "");
    rejected.push(name);
    operations = operations.filter((operation) => operation !== name);
  }

  fail("Gave up narrowing the operation list — Backblaze kept rejecting values.");
}

async function main() {
  loadEnvLocal();

  const missing = ["B2_KEY_ID", "B2_APP_KEY", "B2_BUCKET"].filter(
    (name) => !process.env[name],
  );
  if (missing.length > 0) {
    fail(`Missing ${missing.join(", ")}. Add them to .env.local first.`);
  }

  const bucketName = process.env.B2_BUCKET;
  const configured = (process.env.B2_CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = configured.length > 0 ? configured : DEFAULT_ORIGINS;

  console.log(`Bucket:  ${bucketName}`);
  console.log(`Origins: ${origins.join("\n         ")}`);

  const auth = await authorize(process.env.B2_KEY_ID, process.env.B2_APP_KEY);

  const capabilities = auth.data.apiInfo?.storageApi?.capabilities ?? [];
  if (capabilities.length > 0 && !capabilities.includes("writeBuckets")) {
    fail(
      "This application key cannot change bucket settings — it has no\n" +
        "'writeBuckets' capability. Keys created with a single bucket selected\n" +
        "usually don't.\n\n" +
        "Create a key in B2 → Application Keys with access to ALL buckets, put it\n" +
        "in .env.local just long enough to run this once, then put the scoped key\n" +
        "back. Only this script needs the wider key; the app never does.",
    );
  }

  const apiUrl = auth.data.apiInfo?.storageApi?.apiUrl ?? auth.data.apiUrl;
  if (!apiUrl) {
    fail("Backblaze's reply had no API URL — unexpected response shape.");
  }

  const bucketId = await resolveBucketId(auth, bucketName);
  const applied = await applyRule(
    auth,
    bucketId,
    `${apiUrl}/b2api/${auth.version}/b2_update_bucket`,
    origins,
  );

  if (applied.rejected.length > 0) {
    console.log(`\nNot recognised by this account: ${applied.rejected.join(", ")}`);
  }

  // Read back what Backblaze stored. A write that reports success and a rule
  // that is actually in place are different claims; only the second matters.
  console.log("\nApplied. Backblaze now reports:");
  for (const rule of applied.data.corsRules ?? []) {
    console.log(`  name:       ${rule.corsRuleName}`);
    console.log(`  operations: ${(rule.allowedOperations ?? []).join(", ")}`);
    console.log(`  headers:    ${(rule.allowedHeaders ?? []).join(", ")}`);
    console.log(`  origins:    ${(rule.allowedOrigins ?? []).join(", ")}`);
  }

  const stored = (applied.data.corsRules ?? []).flatMap(
    (rule) => rule.allowedOperations ?? [],
  );
  const check = stored.length > 0 ? stored : applied.operations;
  if (!check.some((operation) => UPLOAD_PATTERN.test(operation))) {
    console.log(
      "\n⚠ No upload operation survived. Uploads will still be blocked —" +
        "\n  none of the names this script knows were accepted.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nChanges take about a minute. Then retry the upload.");
}

// process.exit() while fetch's sockets are still open crashes Node on Windows
// with a libuv assertion (src\win\async.c). Setting exitCode and returning lets
// the process wind down on its own.
try {
  await main();
} catch (error) {
  if (error instanceof Abort) {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
