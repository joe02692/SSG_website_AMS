/**
 * Automatic document expiry — DISABLED.
 *
 * Birth certificates are kept permanently: the group needs them on file, and
 * with images shrunk before upload the storage cost is small enough that
 * deleting them buys nothing.
 *
 * The route is left in place (and does nothing) so any scheduled call that
 * still exists somewhere gets a clear answer rather than a 404. The schedule
 * itself has been removed from vercel.json.
 *
 * If a retention policy is ever wanted, restore the schedule and reinstate the
 * deletion logic from git history — profiles.document_uploaded_at is still
 * recorded, so the data needed for it is there.
 */
export async function GET() {
  return Response.json({
    disabled: true,
    reason: "Certificates are retained permanently by policy.",
  });
}
