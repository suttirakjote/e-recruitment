import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/status";
import type { Department, Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const { dept } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select("*, departments(id, code, name_th)")
    .eq("status", "open")
    .order("published_at", { ascending: false });
  if (dept) query = query.eq("department_id", dept);

  const [{ data: jobs }, { data: departments }] = await Promise.all([
    query,
    supabase.from("departments").select("*").order("name_th"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">ตำแหน่งที่เปิดรับสมัคร</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/jobs"
          className={`rounded-full px-3 py-1 text-sm ${!dept ? "bg-emerald-700 text-white" : "border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"}`}
        >
          ทุกแผนก
        </Link>
        {(departments as Department[] | null)?.map((d) => (
          <Link
            key={d.id}
            href={`/jobs?dept=${d.id}`}
            className={`rounded-full px-3 py-1 text-sm ${dept === d.id ? "bg-emerald-700 text-white" : "border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"}`}
          >
            {d.name_th}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(jobs as Job[] | null)?.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-stone-900">
                  {job.title}
                </h2>
                <Badge className="shrink-0 bg-emerald-100 text-emerald-800">
                  {EMPLOYMENT_TYPE_LABELS[job.employment_type] ??
                    job.employment_type}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {job.departments?.name_th}
                {job.location ? ` · ${job.location}` : ""}
              </p>
              {job.description && (
                <p className="mt-3 line-clamp-2 text-sm text-stone-600">
                  {job.description}
                </p>
              )}
              <p className="mt-4 text-sm font-medium text-emerald-700">
                ดูรายละเอียด →
              </p>
            </Card>
          </Link>
        ))}
        {(!jobs || jobs.length === 0) && (
          <p className="col-span-full py-16 text-center text-stone-500">
            ยังไม่มีตำแหน่งที่เปิดรับสมัครในขณะนี้
          </p>
        )}
      </div>
    </div>
  );
}
