import { getSettings } from "@/lib/settings";
import { PrivacyNoticeForm } from "@/components/hr/settings-forms";

export const dynamic = "force-dynamic";

export default async function PrivacyNoticeSettingsPage() {
  const settings = await getSettings(["privacy_notice_html"]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-stone-900">Privacy Notice</h1>
      <p className="mb-6 text-sm text-stone-500">
        ประกาศคุ้มครองข้อมูลส่วนบุคคลสำหรับผู้สมัครงาน —
        แสดงที่หน้าสาธารณะ /privacy-notice และลิงก์ในขั้นตอนยินยอมของฟอร์มสมัคร
      </p>
      <PrivacyNoticeForm
        initialHtml={(settings.privacy_notice_html as string) ?? ""}
      />
    </div>
  );
}
