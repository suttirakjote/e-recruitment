import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  formatDateTime,
  type ApplicationStatus,
} from "@/lib/status";
import type { Application } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HrApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; job?: string }>;
}) {
  const { status, job } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("applications")
    .select("id, first_name, last_name, email, status, submitted_at, jobs(id, title)")
    .order("submitted_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  if (job) query = query.eq("job_id", job);

  const [{ data: applications }, { data: jobs }] = await Promise.all([
    query.overrideTypes<Application[]>(),
    supabase.from("jobs").select("id, title").order("title"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">ใบสมัครทั้งหมด</h1>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <select name="status" defaultValue={status ?? ""}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
          <option value="">ทุกสถานะ</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s as ApplicationStatus]}</option>
          ))}
        </select>
        <select name="job" defaultValue={job ?? ""}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
          <option value="">ทุกตำแหน่ง</option>
          {jobs?.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
        <button className="rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700">
          กรอง
        </button>
        {(status || job) && (
          <Link href="/hr/applications"
            className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100">
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-6 py-3 font-medium">ผู้สมัคร</th>
              <th className="px-4 py-3 font-medium">ตำแหน่ง</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">วันที่สมัคร</th>
            </tr>
          </thead>
          <tbody>
            {applications?.map((a) => (
              <tr key={a.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                <td className="px-6 py-3">
                  <Link href={`/hr/applications/${a.id}`}
                    className="font-medium text-stone-800 hover:text-emerald-700">
                    {a.first_name} {a.last_name}
                  </Link>
                  <p className="text-xs text-stone-400">{a.email}</p>
                </td>
                <td className="px-4 py-3 text-stone-600">{a.jobs?.title}</td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-stone-500">{formatDateTime(a.submitted_at)}</td>
              </tr>
            ))}
            {(!applications || applications.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-400">
                  ไม่พบใบสมัคร
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
