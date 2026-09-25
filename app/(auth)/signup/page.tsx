import type { Metadata } from "next";
import { AuthIntro } from "@/components/auth/auth-intro";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Register with El-Salam Scouting Group as a scout, parent or leader.",
};

export default function SignupPage() {
  return (
    <>
      <AuthIntro title="Join El-Salam">
          One account for meetings, camps and group records.
      </AuthIntro>

      <SignupForm />
    </>
  );
}
