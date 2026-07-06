import { getProfile } from "@/lib/auth";
import { EmailSettingsForm } from "@/components/hr/email-settings-form";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const profile = await getProfile();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-stone-900">ตั้งค่าอีเมล (SMTP)</h1>
      <p className="mb-6 text-sm text-stone-500">
        ตั้งค่าอีเมลตัวกลางสำหรับส่งการแจ้งเตือน ระยะแรกใช้ Gmail เป็น host
        (ต้องใช้ App Password ของบัญชี Google ที่เปิด 2-Step Verification)
      </p>
      <EmailSettingsForm myEmail={profile?.email ?? ""} />
    </div>
  );
}
