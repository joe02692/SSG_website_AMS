import type { ReactNode } from "react";
import { requireCompletedDetails } from "@/lib/dal";

/**
 * Every page under /dashboard is behind onboarding.
 *
 * Doing it in the layout means one check covers the dashboard, the profile
 * page and the stage page, and any page added later gets it for free.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireCompletedDetails();
  return <>{children}</>;
}
