import { getSettings, logoUrl } from "@/lib/settings";
import { GeneralSettingsForm } from "@/components/hr/settings-forms";

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const settings = await getSettings([
    "org_name",
    "notify_applicant_on_status_change",
    "org_logo_path",
    "primary_color",
  ]);

  const logoPath = (settings.org_logo_path as string) || null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">ตั้งค่าทั่วไป</h1>
      <GeneralSettingsForm
        initialOrgName={(settings.org_name as string) ?? ""}
        initialNotifyApplicant={Boolean(settings.notify_applicant_on_status_change)}
        initialLogoUrl={logoUrl(logoPath)}
        initialPrimaryColor={(settings.primary_color as string) ?? null}
      />
    </div>
  );
}
