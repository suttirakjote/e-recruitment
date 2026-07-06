import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** โปรไฟล์ HR ของผู้ใช้ที่ login อยู่ (null = login แล้วแต่ไม่ได้เป็น HR) */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .single<Profile>();
  return data;
}

export function canWrite(profile: Profile) {
  return profile.role === "hr_admin" || profile.role === "hr_staff";
}

export function isAdmin(profile: Profile) {
  return profile.role === "hr_admin";
}
