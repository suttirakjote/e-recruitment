import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import {
  JOB_STATUS_COLORS,
  JOB_STATUS_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  formatDateTime,
  type ApplicationStatus,
} from "@/lib/status";
import type { Application, Job } from "@/lib/types";
import { JobStatusToggle } from "@/components/hr/job-status-toggle";

export const dynamic = "force-dynamic";

export default async function HrJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: job }, { data: applications }] = await Promise.all([
    supabase.from("jobs").select("*, departments(name_th)").eq("id", id).single<Job>(),
    supabase
      .from("applications")
      .select("id, first_name, last_name, email, status, submitted_at")
      .eq("job_id", id)
      .order("submitted_at", { ascending: false })
      .overrideTypes<Application[]>(),
  ]);

  if (!job) notFound();

  const grouped = new Map<ApplicationStatus, Application[]>();
  for (const status of STATUS_ORDER) grouped.set(status, []);
  for (const app of applications ?? []) grouped.get(app.status)?.push(app);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/hr/recruitment/jobs" className="text-sm text-stone-500 hover:text-emerald-700">
            ← ตำแหน่งงานทั้งหมด
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-900">{job.title}</h1>
            <Badge className={JOB_STATUS_COLORS[job.status]}>
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <p className="text-sm text-stone-500">
            {job.departments?.name_th} · รับ {job.openings} คน · ผู้สมัคร{" "}
            {applications?.length ?? 0} คน
          </p>
        </div>
        <div className="flex gap-2">
          <JobStatusToggle jobId={job.id} status={job.status} />
          <Link href={`/hr/recruitment/jobs/${job.id}/edit`}
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200">
            แก้ไขตำแหน่ง
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {STATUS_ORDER.map((status) => {
          const apps = grouped.get(status) ?? [];
          if (apps.length === 0) return null;
          return (
            <Card key={status} className="p-4">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                <span className="text-sm text-stone-400">{apps.length} คน</span>
              </div>
              <div className="mt-3 divide-y divide-stone-100">
                {apps.map((a) => (
                  <Link key={a.id} href={`/hr/recruitment/applications/${a.id}`}
                    className="flex items-center justify-between py-2 hover:bg-stone-50">
                    <span className="font-medium text-stone-800">
                      {a.first_name} {a.last_name}
                      <span className="ml-2 text-xs font-normal text-stone-400">{a.email}</span>
                    </span>
                    <span className="text-xs text-stone-400">{formatDateTime(a.submitted_at)}</span>
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
        {(applications?.length ?? 0) === 0 && (
          <Card><p className="py-8 text-center text-stone-400">ยังไม่มีผู้สมัครตำแหน่งนี้</p></Card>
        )}
      </div>
    </div>
  );
}
