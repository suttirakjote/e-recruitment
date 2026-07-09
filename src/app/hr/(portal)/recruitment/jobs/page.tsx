import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import { JOB_STATUS_COLORS, JOB_STATUS_LABELS, type JobStatus } from "@/lib/status";
import { JobStatusToggle } from "@/components/hr/job-status-toggle";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  title: string;
  status: JobStatus;
  openings: number;
  departments: { name_th: string } | null;
  applications: { count: number }[];
}

export default async function HrJobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, openings, departments(name_th), applications(count)")
    .order("created_at", { ascending: false })
    .overrideTypes<JobRow[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">ตำแหน่งงาน</h1>
        <Link
          href="/hr/recruitment/jobs/new"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          + สร้างตำแหน่งใหม่
        </Link>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-6 py-3 font-medium">ตำแหน่ง</th>
              <th className="px-4 py-3 font-medium">แผนก</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 text-center font-medium">รับ (คน)</th>
              <th className="px-4 py-3 text-center font-medium">ผู้สมัคร</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {jobs?.map((job) => (
              <tr key={job.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                <td className="px-6 py-3">
                  <Link href={`/hr/recruitment/jobs/${job.id}`} className="font-medium text-stone-800 hover:text-emerald-700">
                    {job.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-600">{job.departments?.name_th}</td>
                <td className="px-4 py-3">
                  <Badge className={JOB_STATUS_COLORS[job.status]}>
                    {JOB_STATUS_LABELS[job.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center text-stone-600">{job.openings}</td>
                <td className="px-4 py-3 text-center">
                  <Link href={`/hr/recruitment/jobs/${job.id}`}
                    className="font-semibold text-emerald-700 hover:underline">
                    {job.applications?.[0]?.count ?? 0}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <JobStatusToggle jobId={job.id} status={job.status} />
                    <Link href={`/hr/recruitment/jobs/${job.id}/edit`}
                      className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200">
                      แก้ไข
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {(!jobs || jobs.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400">
                  ยังไม่มีตำแหน่งงาน — กด &quot;สร้างตำแหน่งใหม่&quot; เพื่อเริ่มต้น
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
