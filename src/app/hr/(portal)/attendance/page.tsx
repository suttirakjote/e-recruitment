import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import { Avatar } from "@/components/hr/avatar";
import { LocationView } from "@/components/ess/location-view";
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  formatTime,
  type AttendanceStatus,
} from "@/lib/status";

export const dynamic = "force-dynamic";

interface EmpRow {
  id: string;
  first_name: string;
  last_name: string;
  photo_path: string | null;
  position_title: string | null;
  departments: { name_th: string } | null;
}
interface AttRow {
  employee_id: string;
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  work_mode: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
}

export default async function HrAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const selectedDate = date || today;

  const supabase = await createClient();
  const [{ data: employees }, { data: records }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, photo_path, position_title, departments(name_th)")
      .in("status", ["active", "probation", "on_leave"])
      .order("first_name")
      .overrideTypes<EmpRow[]>(),
    supabase
      .from("attendance_records")
      .select("employee_id, clock_in, clock_out, status, work_mode, clock_in_lat, clock_in_lng")
      .eq("work_date", selectedDate)
      .overrideTypes<AttRow[]>(),
  ]);

  const byEmp = new Map<string, AttRow>();
  for (const r of records ?? []) byEmp.set(r.employee_id, r);

  const presentCount = (records ?? []).filter((r) => r.clock_in).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ลงเวลาทำงาน</h1>
          <p className="text-sm text-stone-500">
            ลงเวลาแล้ว {presentCount} / {employees?.length ?? 0} คน
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input type="date" name="date" defaultValue={selectedDate}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm" />
          <button className="rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700">
            ดู
          </button>
        </form>
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-6 py-3 font-medium">พนักงาน</th>
              <th className="px-4 py-3 font-medium">แผนก</th>
              <th className="px-4 py-3 font-medium">เข้า</th>
              <th className="px-4 py-3 font-medium">ออก</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">โหมด / ตำแหน่ง</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((e) => {
              const rec = byEmp.get(e.id);
              return (
                <tr key={e.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar photoPath={e.photo_path} name={`${e.first_name} ${e.last_name}`} size={32} />
                      <span className="font-medium text-stone-800">{e.first_name} {e.last_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{e.departments?.name_th ?? "-"}</td>
                  <td className="px-4 py-3 text-stone-600">{formatTime(rec?.clock_in)}</td>
                  <td className="px-4 py-3 text-stone-600">{formatTime(rec?.clock_out)}</td>
                  <td className="px-4 py-3">
                    {rec ? (
                      <Badge className={ATTENDANCE_STATUS_COLORS[rec.status]}>
                        {ATTENDANCE_STATUS_LABELS[rec.status]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-stone-400">ยังไม่ลงเวลา</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rec?.work_mode === "remote" && (
                      <span className="mb-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                        นอกสถานที่
                      </span>
                    )}
                    {rec && <LocationView lat={rec.clock_in_lat} lng={rec.clock_in_lng} label="แผนที่" />}
                  </td>
                </tr>
              );
            })}
            {(!employees || employees.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-stone-400">ยังไม่มีพนักงาน</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
