import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Register with El-Salam Scouting Group as a scout, parent or leader.",
};

export default function SignupPage() {
  return (
    <div className="rounded-2xl border border-line bg-canvas p-6 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Join El-Salam
        </h1>
        <p className="text-sm text-ink-muted">
          One account for meetings, camps and group records.
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
