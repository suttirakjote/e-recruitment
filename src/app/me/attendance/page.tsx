import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ClockWidget } from "@/components/ess/clock-widget";
import { LocationView } from "@/components/ess/location-view";
import {
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_LABELS,
  formatDate,
  formatTime,
  type AttendanceStatus,
} from "@/lib/status";

export const dynamic = "force-dynamic";

interface Rec {
  id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  work_mode: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
}

export default async function MyAttendancePage() {
  const profile = await getProfile();
  if (!profile?.employee_id) {
    return (
      <Card>
        <p className="text-stone-700">บัญชีของคุณยังไม่ได้เชื่อมกับข้อมูลพนักงาน</p>
      </Card>
    );
  }

  const supabase = await createClient();
  // วันที่ปัจจุบันตามเวลาไทย
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, work_date, clock_in, clock_out, status, work_mode, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng")
    .eq("employee_id", profile.employee_id)
    .order("work_date", { ascending: false })
    .limit(30)
    .overrideTypes<Rec[]>();

  const todayRec = records?.find((r) => r.work_date === today) ?? null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">ลงเวลาทำงาน</h1>

      <ClockWidget
        clockInAt={todayRec?.clock_in ?? null}
        clockOutAt={todayRec?.clock_out ?? null}
        workMode={todayRec?.work_mode ?? null}
        clockInLat={todayRec?.clock_in_lat ?? null}
        clockInLng={todayRec?.clock_in_lng ?? null}
        clockOutLat={todayRec?.clock_out_lat ?? null}
        clockOutLng={todayRec?.clock_out_lng ?? null}
      />

      <Card className="mt-6">
        <SectionTitle>ประวัติการลงเวลา (30 วันล่าสุด)</SectionTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="pb-2 font-medium">วันที่</th>
              <th className="pb-2 font-medium">เข้า</th>
              <th className="pb-2 font-medium">ออก</th>
              <th className="pb-2 font-medium">สถานะ</th>
              <th className="pb-2 font-medium">โหมด / ตำแหน่ง</th>
            </tr>
          </thead>
          <tbody>
            {records?.map((r) => (
              <tr key={r.id} className="border-b border-stone-100 align-top last:border-0">
                <td className="py-2 text-stone-700">{formatDate(r.work_date)}</td>
                <td className="py-2 text-stone-600">{formatTime(r.clock_in)}</td>
                <td className="py-2 text-stone-600">{formatTime(r.clock_out)}</td>
                <td className="py-2">
                  <Badge className={ATTENDANCE_STATUS_COLORS[r.status]}>
                    {ATTENDANCE_STATUS_LABELS[r.status]}
                  </Badge>
                </td>
                <td className="py-2">
                  {r.work_mode === "remote" && (
                    <span className="mb-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                      นอกสถานที่
                    </span>
                  )}
                  <LocationView lat={r.clock_in_lat} lng={r.clock_in_lng} label="แผนที่" />
                </td>
              </tr>
            ))}
            {(!records || records.length === 0) && (
              <tr><td colSpan={5} className="py-8 text-center text-stone-400">ยังไม่มีประวัติการลงเวลา</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
