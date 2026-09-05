import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachmentDisposition } from "@/lib/documents";

/**
 * Backblaze B2 — where scouts' birth certificates live, permanently.
 *
 * B2 speaks the S3 API, so this is the standard AWS SDK pointed at a
 * Backblaze endpoint.
 *
 * ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE.
 *
 * When these files were in Supabase Storage, the DATABASE enforced who could
 * read them: a policy compared the file's folder to auth.uid(), and no
 * application bug could get around it. B2 has no idea what a Supabase user is.
 *
 * The checks in the calling Server Actions are now the ONLY thing standing
 * between a stranger and a child's identity document. Every function below is
 * dangerous if called without first establishing who is asking.
 *
 * Rules that follow:
 *   • The bucket must stay PRIVATE. Never set it to public in the B2 console.
 *   • Never return a URL from here without checking the caller first.
 *   • Keys are always `<profile_id>/<filename>`, so ownership is checkable.
 */

const UPLOAD_URL_TTL = 300; // seconds — generous, phone uploads can be slow
const DOWNLOAD_URL_TTL = 60;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const REQUIRED_ENV = [
  "B2_KEY_ID",
  "B2_APP_KEY",
  "B2_BUCKET",
  "B2_ENDPOINT",
  "B2_REGION",
] as const;

/**
 * Which B2 variables are missing, by name.
 *
 * Worth its own function: "storage isn't configured" is a useless thing to
 * read when four of the five are set and you can't tell which one you fumbled.
 * Callers put these names in the error they show.
 */
export function missingStorageEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

function config() {
  const missing = missingStorageEnv();
  if (missing.length > 0) {
    throw new Error(
      `Backblaze B2 is not configured — missing ${missing.join(", ")}.`,
    );
  }
  return {
    keyId: String(process.env.B2_KEY_ID),
    appKey: String(process.env.B2_APP_KEY),
    bucket: String(process.env.B2_BUCKET),
    endpoint: String(process.env.B2_ENDPOINT),
    region: String(process.env.B2_REGION),
  };
}

/** True when the B2 environment variables are present. */
export function storageConfigured(): boolean {
  return missingStorageEnv().length === 0;
}

function client() {
  const { keyId, appKey, endpoint, region } = config();
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId: keyId, secretAccessKey: appKey },
    // Path-style — https://s3.<region>.backblazeb2.com/<bucket>/<key> — the
    // form Backblaze documents.
    //
    // Pinned rather than inferred. The SDK already picks path-style on its own
    // for our bucket, because a name containing periods or capitals isn't
    // DNS-safe and it falls back; the generated URL is byte-identical with and
    // without this flag. But that is a heuristic about the bucket name, and if
    // the bucket is ever renamed to something DNS-safe the SDK would silently
    // switch to <bucket>.s3.<region>.backblazeb2.com. Stating the intent costs
    // one line and removes the surprise.
    //
    // Related, and the reason to care: Backblaze advises using only lowercase
    // letters, numbers and hyphens in bucket names, because periods break
    // virtual-hosted-style HTTPS — they add DNS labels their wildcard
    // certificate doesn't cover.
    forcePathStyle: true,

    // Do not attach a checksum unless the operation requires one.
    //
    // Recent AWS SDK versions default to WHEN_SUPPORTED, which adds
    // x-amz-checksum-crc32 to a PutObject. For a *presigned* upload that is
    // actively wrong: the checksum is computed when the URL is signed, and at
    // that moment there is no body — so the URL carries the CRC32 of nothing
    // (x-amz-checksum-crc32=AAAAAA==) while the browser then PUTs a real
    // photo. The signature is valid, the payload is fine, and the upload is
    // rejected for a mismatch that was baked in before the file was chosen.
    //
    // This is the standard fix for presigned uploads to non-AWS S3 services
    // (Backblaze, R2, MinIO). Verified: with this set, the checksum query
    // parameters disappear from the signed URL.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function bucketName(): string {
  return config().bucket;
}

/**
 * A short-lived URL the browser can PUT one file to.
 *
 * ContentType is baked into the signature, so an upload authorised for a JPEG
 * cannot be used to push something else.
 *
 * Note: unlike the R2 attempt, ContentLength is deliberately NOT signed —
 * B2's S3 layer is stricter about header matching and browsers don't always
 * send the header identically. Size is enforced client-side and by the
 * server issuing the ticket.
 */
export async function presignUpload(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), command, { expiresIn: UPLOAD_URL_TTL });
}

/**
 * A short-lived URL for reading one file.
 *
 * `downloadName` sets Content-Disposition so the browser saves rather than
 * displays it; omit it to view in a tab.
 */
export async function presignDownload(
  key: string,
  downloadName?: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ...(downloadName
      ? { ResponseContentDisposition: attachmentDisposition(downloadName) }
      : {}),
  });
  return getSignedUrl(client(), command, { expiresIn: DOWNLOAD_URL_TTL });
}

/** Reads a whole object into memory. Used to build the bulk ZIP. */
export async function getObjectBytes(key: string): Promise<Uint8Array | null> {
  try {
    const result = await client().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: key }),
    );
    if (!result.Body) return null;
    return await result.Body.transformToByteArray();
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await client().send(
      new DeleteObjectCommand({ Bucket: bucketName(), Key: key }),
    );
  } catch {
    // A missing object is not an error worth surfacing — the caller wanted
    // the file gone, and it is.
  }
}
