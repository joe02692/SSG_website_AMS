"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { getT } from "@/lib/i18n/server";

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
  const t = (await getT()).account.profile;
  const user = await getCurrentUser();
  if (!user) return { error: t.signInFirst };

  const raw = formData.get("fullName");
  const fullName = typeof raw === "string" ? raw.trim() : "";

  if (fullName.length < 2) {
    return { fieldErrors: { fullName: t.enterName } };
  }
  if (fullName.length > MAX_NAME_LENGTH) {
    return {
      fieldErrors: {
        fullName: t.nameTooLong(MAX_NAME_LENGTH),
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
    return { error: t.couldNotSave };
  }

  // The header greets members by name, so refresh the whole layout.
  revalidatePath("/", "layout");
  return { notice: t.saved };
}

// Birth-certificate handling moved to ./document-actions.ts when storage
// moved from Supabase Storage to Cloudflare R2.
