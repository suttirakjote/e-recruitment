import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatDateTime,
} from "@/lib/status";
import type { Application } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HrDashboard() {
  const supabase = await createClient();
  // eslint-disable-next-line react-hooks/purity -- async server component รันบน server ครั้งเดียว ใช้เวลาปัจจุบันได้
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [employeeCount, openJobs, newApps, myQueue, recent] =
    await Promise.all([
      supabase.from("employees").select("id", { count: "exact", head: true })
        .in("status", ["active", "probation", "on_leave"]),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("applications").select("id", { count: "exact", head: true }).gte("submitted_at", weekAgo),
      supabase.from("application_approvals").select("id", { count: "exact", head: true })
        .eq("approver_id", user?.id ?? "").eq("decision", "pending"),
      supabase.from("applications")
        .select("id, first_name, last_name, status, submitted_at, jobs(title)")
        .order("submitted_at", { ascending: false })
        .limit(8),
    ]);

  const stats = [
    { label: "พนักงานทั้งหมด", value: employeeCount.count ?? 0, href: "/hr/employees" },
    { label: "ตำแหน่งที่เปิดรับ", value: openJobs.count ?? 0, href: "/hr/recruitment/jobs" },
    { label: "ใบสมัครใหม่ (7 วัน)", value: newApps.count ?? 0, href: "/hr/recruitment/applications" },
    { label: "รอฉันอนุมัติ", value: myQueue.count ?? 0, href: "/hr/recruitment/approvals" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">ภาพรวม</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <p className="text-sm text-stone-500">{s.label}</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-800">ใบสมัครล่าสุด</h2>
          <Link href="/hr/recruitment/applications" className="text-sm text-emerald-700 hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="pb-2 font-medium">ผู้สมัคร</th>
              <th className="pb-2 font-medium">ตำแหน่ง</th>
              <th className="pb-2 font-medium">สถานะ</th>
              <th className="pb-2 font-medium">วันที่สมัคร</th>
            </tr>
          </thead>
          <tbody>
            {(recent.data as unknown as Application[] | null)?.map((a) => (
              <tr key={a.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                <td className="py-2.5">
                  <Link href={`/hr/recruitment/applications/${a.id}`} className="font-medium text-stone-800 hover:text-emerald-700">
                    {a.first_name} {a.last_name}
                  </Link>
                </td>
                <td className="py-2.5 text-stone-600">{a.jobs?.title}</td>
                <td className="py-2.5">
                  <Badge className={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                </td>
                <td className="py-2.5 text-stone-500">{formatDateTime(a.submitted_at)}</td>
              </tr>
            ))}
            {(!recent.data || recent.data.length === 0) && (
              <tr><td colSpan={4} className="py-8 text-center text-stone-400">ยังไม่มีใบสมัคร</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
