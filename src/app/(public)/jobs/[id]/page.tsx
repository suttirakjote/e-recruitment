import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/status";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*, departments(name_th)")
    .eq("id", id)
    .eq("status", "open")
    .single<Job>();

  if (!job) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/jobs" className="text-sm text-stone-500 hover:text-emerald-700">
        ← กลับไปหน้าตำแหน่งงาน
      </Link>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">{job.title}</h1>
          <Badge className="bg-emerald-100 text-emerald-800">
            {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
          </Badge>
        </div>
        <p className="mt-2 text-stone-500">
          {job.departments?.name_th}
          {job.location ? ` · ${job.location}` : ""}
          {job.salary_range ? ` · ${job.salary_range}` : ""}
        </p>

        {job.description && (
          <section className="mt-6">
            <h2 className="font-semibold text-stone-800">รายละเอียดงาน</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-600">
              {job.description}
            </p>
          </section>
        )}

        {job.requirements && (
          <section className="mt-6">
            <h2 className="font-semibold text-stone-800">คุณสมบัติผู้สมัคร</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-600">
              {job.requirements}
            </p>
          </section>
        )}

        <div className="mt-8 border-t border-stone-100 pt-6">
          <Link
            href={`/jobs/${job.id}/apply`}
            className="inline-flex rounded-lg bg-emerald-700 px-8 py-3 font-medium text-white hover:bg-emerald-800"
          >
            สมัครตำแหน่งนี้
          </Link>
        </div>
      </div>
    </div>
  );
}
