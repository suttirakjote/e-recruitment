import { createClient } from "@/lib/supabase/server";
import { UserManager } from "@/components/hr/user-manager";
import type { Department, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: departments }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("departments").select("*").order("name_th"),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-stone-900">ผู้ใช้งานระบบ</h1>
      <p className="mb-6 text-sm text-stone-500">
        บัญชี HR / ผู้อนุมัติ สร้างโดยผู้ดูแลระบบเท่านั้น (ไม่มีการสมัครเอง)
        — สร้างแล้วแจ้งอีเมลและรหัสผ่านเริ่มต้นให้ผู้ใช้โดยตรง
      </p>
      <UserManager
        profiles={(profiles as Profile[]) ?? []}
        departments={(departments as Department[]) ?? []}
      />
    </div>
  );
}
