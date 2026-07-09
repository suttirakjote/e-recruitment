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

const HR_PORTAL_ROLES = ["hr_admin", "hr_staff", "approver", "viewer"];

/** ผู้ใช้ที่เข้า HR Workspace ได้ (ไม่ใช่พนักงาน ESS ล้วน) */
export function isHrPortalUser(profile: Profile) {
  return HR_PORTAL_ROLES.includes(profile.role);
}

/** ข้อมูลพนักงานของผู้ใช้ที่ล็อกอิน (สำหรับ ESS) — null ถ้าบัญชียังไม่ผูกกับพนักงาน */
export async function getMyEmployee() {
  const profile = await getProfile();
  if (!profile?.employee_id) return { profile, employee: null };
  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("*, departments(name_th), manager:manager_id(first_name, last_name)")
    .eq("id", profile.employee_id)
    .single();
  return { profile, employee };
}
