import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { Card } from "@/components/ui";
import { computeWorkdays, MONTH_NAMES_TH } from "@/lib/workdays";

export const dynamic = "force-dynamic";

interface EmpRow {
  id: string;
  first_name: string;
  last_name: string;
  departments: { name_th: string } | null;
}
interface LeaveType {
  id: string;
  name: string;
  annual_quota_days: number;
}
interface Entry {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  days: number;
}

function pctColor(pct: number): string {
  if (pct >= 20) return "bg-rose-100 text-rose-800";
  if (pct >= 10) return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export default async function LeaveSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const thisYear = new Date().getFullYear();
  const year = Number(yearParam) || thisYear;

  const supabase = await createClient();
  const [settings, { data: holidayRows }, { data: leaveTypes }, { data: employees }, { data: entries }] =
    await Promise.all([
      getSettings(["working_weekdays"]),
      supabase.from("company_holidays").select("holiday_date"),
      supabase.from("leave_types").select("id, name, annual_quota_days").order("sort_order").order("name").overrideTypes<LeaveType[]>(),
      supabase.from("employees").select("id, first_name, last_name, departments(name_th)")
        .in("status", ["active", "probation", "on_leave"]).order("first_name").overrideTypes<EmpRow[]>(),
      supabase.from("leave_entries")
        .select("employee_id, leave_type_id, start_date, days")
        .gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`)
        .overrideTypes<Entry[]>(),
    ]);

  const weekdays = Array.isArray(settings.working_weekdays)
    ? (settings.working_weekdays as number[])
    : [1, 2, 3, 4, 5];
  const holidays = new Set(
    (holidayRows ?? [])
      .filter((h) => new Date(h.holiday_date).getFullYear() === year)
      .map((h) => h.holiday_date)
  );
  const { perMonth: workPerMonth, total: workTotal } = computeWorkdays(year, weekdays, holidays);

  const types = leaveTypes ?? [];
  const emps = employees ?? [];

  // aggregate
  const empType = new Map<string, Map<string, number>>(); // empId -> typeId -> days
  const empMonth = new Map<string, number[]>();            // empId -> [12] total days
  const empTotal = new Map<string, number>();
  const typeTotal = new Map<string, number>();
  for (const e of entries ?? []) {
    const m = new Date(e.start_date).getMonth();
    if (!empType.has(e.employee_id)) empType.set(e.employee_id, new Map());
    const tm = empType.get(e.employee_id)!;
    tm.set(e.leave_type_id, (tm.get(e.leave_type_id) ?? 0) + Number(e.days));
    if (!empMonth.has(e.employee_id)) empMonth.set(e.employee_id, Array(12).fill(0));
    empMonth.get(e.employee_id)![m] += Number(e.days);
    empTotal.set(e.employee_id, (empTotal.get(e.employee_id) ?? 0) + Number(e.days));
    typeTotal.set(e.leave_type_id, (typeTotal.get(e.leave_type_id) ?? 0) + Number(e.days));
  }
  const grandTotal = [...empTotal.values()].reduce((a, b) => a + b, 0);

  const years = [thisYear - 1, thisYear, thisYear + 1];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">สรุปวันลา</h1>
        <form method="get" className="flex items-center gap-2">
          <select name="year" defaultValue={year}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
            {years.map((y) => <option key={y} value={y}>ปี {y + 543}</option>)}
          </select>
          <button className="rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700">ดู</button>
        </form>
      </div>

      {types.length === 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ยังไม่มีประเภทวันลา — ตั้งค่าได้ที่{" "}
          <Link href="/hr/settings/work-calendar" className="font-medium underline">ปฏิทินงาน & วันลา</Link>
        </p>
      )}

      {/* วันทำงาน */}
      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-stone-800">วันทำงานปี {year + 543}</h2>
          <span className="text-sm text-stone-500">
            รวมทั้งปี <b className="text-2xl text-emerald-700">{workTotal}</b> วัน
            <span className="ml-2 text-xs">(หักเสาร์-อาทิตย์ + วันหยุด {holidays.size} วัน)</span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-12">
          {workPerMonth.map((w, i) => (
            <div key={i} className="rounded-lg bg-stone-50 py-2 text-center">
              <p className="text-xs text-stone-400">{MONTH_NAMES_TH[i]}</p>
              <p className="text-sm font-semibold text-stone-700">{w}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* สรุปต่อประเภท */}
      {types.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 font-semibold text-stone-800">วันลาที่ใช้ทั้งหมด แยกตามประเภท</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {types.map((t) => (
              <div key={t.id} className="rounded-lg border border-stone-200 p-3">
                <p className="text-sm text-stone-500">{t.name}</p>
                <p className="text-2xl font-bold text-stone-800">{typeTotal.get(t.id) ?? 0}</p>
                <p className="text-xs text-stone-400">โควตา {t.annual_quota_days} วัน/คน</p>
              </div>
            ))}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-700">รวมทุกประเภท</p>
              <p className="text-2xl font-bold text-emerald-800">{grandTotal}</p>
              <p className="text-xs text-emerald-600">วัน (ทุกคน)</p>
            </div>
          </div>
        </Card>
      )}

      {/* ตารางรายพนักงาน (รายปี) */}
      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-6 py-3 font-medium">พนักงาน</th>
              {types.map((t) => (
                <th key={t.id} className="px-3 py-3 text-center font-medium">{t.name}</th>
              ))}
              <th className="px-3 py-3 text-center font-medium">รวมลา</th>
              <th className="px-3 py-3 text-center font-medium">วันทำงาน</th>
              <th className="px-3 py-3 text-center font-medium">% ลา/ทำงาน</th>
            </tr>
          </thead>
          <tbody>
            {emps.map((e) => {
              const total = empTotal.get(e.id) ?? 0;
              const pct = workTotal > 0 ? (total / workTotal) * 100 : 0;
              return (
                <tr key={e.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-6 py-2.5">
                    <Link href={`/hr/employees/${e.id}`} className="font-medium text-stone-800 hover:text-emerald-700">
                      {e.first_name} {e.last_name}
                    </Link>
                    {e.departments?.name_th && (
                      <span className="ml-2 text-xs text-stone-400">{e.departments.name_th}</span>
                    )}
                  </td>
                  {types.map((t) => (
                    <td key={t.id} className="px-3 py-2.5 text-center text-stone-600">
                      {empType.get(e.id)?.get(t.id) ?? "-"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center font-semibold text-stone-800">{total || "-"}</td>
                  <td className="px-3 py-2.5 text-center text-stone-500">{workTotal}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pctColor(pct)}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            {emps.length === 0 && (
              <tr><td colSpan={types.length + 4} className="px-6 py-12 text-center text-stone-400">ยังไม่มีพนักงาน</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Breakdown รายเดือน (รวมวันลาต่อเดือน) */}
      <Card className="mt-4 overflow-x-auto p-0">
        <div className="px-6 pt-4">
          <h2 className="font-semibold text-stone-800">วันลารายเดือน (รวมทุกประเภท)</h2>
        </div>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="px-6 py-2 text-left font-medium">พนักงาน</th>
              {MONTH_NAMES_TH.map((m) => (
                <th key={m} className="px-2 py-2 text-center font-medium">{m}</th>
              ))}
              <th className="px-3 py-2 text-center font-medium">รวม</th>
            </tr>
          </thead>
          <tbody>
            {emps.map((e) => {
              const months = empMonth.get(e.id) ?? Array(12).fill(0);
              const total = empTotal.get(e.id) ?? 0;
              return (
                <tr key={e.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-6 py-2 text-stone-700">{e.first_name} {e.last_name}</td>
                  {months.map((d, i) => (
                    <td key={i} className={`px-2 py-2 text-center ${d > 0 ? "font-medium text-stone-800" : "text-stone-300"}`}>
                      {d || "·"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold text-stone-800">{total || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
