"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";

export type ProfileState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  notice?: string;
};

const MAX_NAME_LENGTH = 120;

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  // Server Actions are reachable by direct POST, so this check is the gate —
  // not the page render that happened to precede it.
  const user = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const raw = formData.get("fullName");
  const fullName = typeof raw === "string" ? raw.trim() : "";

  if (fullName.length < 2) {
    return { fieldErrors: { fullName: "Please enter your full name." } };
  }
  if (fullName.length > MAX_NAME_LENGTH) {
    return {
      fieldErrors: {
        fullName: `Keep it under ${MAX_NAME_LENGTH} characters.`,
      },
    };
  }

  const supabase = await createClient();

  // Note what is NOT in this update: `role`. Even if a crafted request added
  // it, the "update own" RLS policy plus the prevent_role_escalation()
  // trigger would reject the change at the database.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your details. Please try again." };
  }

  // The header greets members by name, so refresh the whole layout.
  revalidatePath("/", "layout");
  return { notice: "Your details have been saved." };
}

// Birth-certificate handling moved to ./document-actions.ts when storage
// moved from Supabase Storage to Cloudflare R2.
