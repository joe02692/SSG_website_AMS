import JSZip from "jszip";
import { getCurrentProfile } from "@/lib/dal";
import { isSiteAdminRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getObjectBytes } from "@/lib/b2";
import { nameSlug } from "@/lib/documents";

/**
 * Bundles every scout's document into one ZIP.
 *
 * A Route Handler rather than a Server Action, because the response is a
 * binary file the browser should save — Server Actions return data to React,
 * not downloads.
 *
 * Limits below are not arbitrary: this runs in a serverless function with
 * finite memory and a request timeout, and the whole archive is assembled in
 * memory before being sent. A few dozen certificates is comfortable; the
 * entire group's would not be. If the group outgrows this, the answer is a
 * background job writing the ZIP to storage, not a bigger cap here.
 */
const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024; // 150 MB

type Row = {
  document_path: string | null;
  profiles: { full_name: string | null } | null;
  stages: { name_en: string } | null;
};

export async function GET() {
  // Route Handlers get no protection from the page's requireSiteAdmin(), so
  // the check is repeated here. Storage RLS would also refuse the downloads,
  // but a clean 403 beats an empty archive.
  const viewer = await getCurrentProfile();
  if (!isSiteAdminRole(viewer?.role)) {
    return new Response("Not allowed", { status: 403 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("scout_details")
    .select("document_path, profiles(full_name), stages(name_en)")
    .not("document_path", "is", null);

  const rows = ((data ?? []) as unknown as Row[]).filter(
    (r) => r.document_path,
  );

  if (rows.length === 0) {
    return new Response("No documents to download.", { status: 404 });
  }
  if (rows.length > MAX_FILES) {
    return new Response(
      `Too many documents to bundle in one go (${rows.length}). Download by stage instead.`,
      { status: 413 },
    );
  }

  const zip = new JSZip();
  let totalBytes = 0;
  let added = 0;
  const failed: string[] = [];

  // Fetch in small parallel batches rather than one at a time.
  //
  // This loop used to be strictly serial. At ~300ms per Backblaze GET, 200
  // certificates is a full minute of waiting before the ZIP even starts
  // compressing — comfortably past a serverless timeout, so the feature broke
  // exactly when it was most needed (a big export) and worked fine in testing
  // with three files.
  //
  // Eight at a time, not unbounded: 200 concurrent reads would hold 200
  // response bodies in a function with finite memory, which trades a timeout
  // for an OOM. The budget is checked between batches, so the early abort is
  // slightly less prompt than before — it can overshoot by at most one batch,
  // which is the price of not waiting a minute.
  const CONCURRENCY = 8;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(
      batch.map(async (row) => ({
        row,
        bytes: await getObjectBytes(row.document_path as string),
      })),
    );

    for (const { row, bytes } of fetched) {
      const path = row.document_path as string;

      if (!bytes) {
        failed.push(row.profiles?.full_name ?? path);
        continue;
      }

      totalBytes += bytes.byteLength;

      const extension = path.split(".").pop() ?? "jpg";
      const folder = nameSlug(row.stages?.name_en ?? "Unassigned");
      const person = nameSlug(row.profiles?.full_name);
      // Same name twice would silently overwrite inside the archive.
      zip.file(`${folder}/${person}-${added + 1}.${extension}`, bytes);
      added += 1;
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      return new Response(
        "These documents add up to more than 150 MB. Download by stage instead.",
        { status: 413 },
      );
    }
  }

  if (failed.length > 0) {
    zip.file(
      "MISSING.txt",
      `These documents could not be read and are not in this archive:\n\n${failed.join("\n")}\n`,
    );
  }

  const archive = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    // Certificates are mostly JPEGs, which are already compressed — a low
    // level keeps the function fast without meaningfully larger output.
    compressionOptions: { level: 3 },
  });

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(archive as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="scout-certificates-${stamp}.zip"`,
      "Content-Length": String(archive.byteLength),
      // Never let a CDN or browser keep a copy of this.
      "Cache-Control": "no-store, private",
    },
  });
}
