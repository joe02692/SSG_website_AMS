import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`.
 * The exported function must be named `proxy` (default export also works,
 * but the named form is what the framework documents).
 *
 * Note: `proxy` runs on the Node.js runtime and that is not configurable
 * in v16 — which suits @supabase/ssr fine.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     * - _next/static, _next/image  (build output)
     * - favicon.ico, sitemap.xml, robots.txt
     * - image and font files
     *
     * Auth cookie refresh should be as close to "every request" as
     * possible, otherwise sessions expire in tabs left open overnight.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf)$).*)",
  ],
};
