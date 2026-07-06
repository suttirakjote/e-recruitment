import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { Card, SectionTitle } from "@/components/ui";
import { HR_ROLE_LABELS } from "@/lib/status";
import { AvatarUpload } from "@/components/hr/avatar-upload";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) return null;

  let departmentName: string | null = null;
  if (profile.department_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("departments")
      .select("name_th")
      .eq("id", profile.department_id)
      .single();
    departmentName = data?.name_th ?? null;
  }

  const rows: [string, string][] = [
    ["ชื่อ-นามสกุล", profile.full_name],
    ["อีเมล", profile.email],
    ["บทบาท", HR_ROLE_LABELS[profile.role]],
    ["ตำแหน่งงาน", profile.job_title ?? "-"],
    ["แผนก", departmentName ?? "-"],
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">ข้อมูลส่วนตัว</h1>
      <Card className="max-w-xl">
        <SectionTitle>รูปพนักงาน</SectionTitle>
        <AvatarUpload
          userId={profile.id}
          name={profile.full_name}
          photoPath={profile.photo_path}
          mode="self"
          size={96}
        />
        <p className="mt-2 text-xs text-stone-500">
          รูปนี้จะแสดงในขั้นตอนการอนุมัติและหน้าจัดการผู้ใช้ (ไฟล์รูป ≤ 2MB)
        </p>

        <div className="mt-6">
          <SectionTitle>ข้อมูลบัญชี</SectionTitle>
          <dl className="grid gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-stone-400">{label}</dt>
                <dd className="text-sm text-stone-800">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-stone-400">
            หากต้องการแก้ไขบทบาท ตำแหน่ง หรือแผนก กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </Card>
    </div>
  );
}
