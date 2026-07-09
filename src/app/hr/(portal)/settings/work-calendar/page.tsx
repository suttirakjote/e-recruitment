import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { WorkCalendarManager } from "@/components/hr/work-calendar-manager";

export const dynamic = "force-dynamic";

export default async function WorkCalendarPage() {
  const supabase = await createClient();
  const [settings, { data: holidays }, { data: leaveTypes }] = await Promise.all([
    getSettings(["working_weekdays"]),
    supabase.from("company_holidays").select("holiday_date, name").order("holiday_date"),
    supabase.from("leave_types").select("id, name, annual_quota_days, color").order("sort_order").order("name"),
  ]);

  const weekdays = Array.isArray(settings.working_weekdays)
    ? (settings.working_weekdays as number[])
    : [1, 2, 3, 4, 5];

  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-stone-900">ปฏิทินงาน & วันลา</h1>
      <p className="mb-6 text-sm text-stone-500">
        กำหนดวันทำงาน วันหยุดบริษัท และประเภทวันลา — ใช้คำนวณวันทำงานและสรุปในหน้าภาพรวม → สรุปวันลา
      </p>
      <WorkCalendarManager
        initialWeekdays={weekdays}
        holidays={holidays ?? []}
        leaveTypes={leaveTypes ?? []}
        years={years}
      />
    </div>
  );
}
