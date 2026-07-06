import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/hr/job-form";
import type { Department, Job, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: job }, { data: departments }, { data: profiles }, { data: recruiters }] =
    await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).single<Job>(),
      supabase.from("departments").select("*").order("name_th"),
      supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
      supabase.from("job_recruiters").select("profile_id").eq("job_id", id),
    ]);

  if (!job) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">แก้ไขตำแหน่ง: {job.title}</h1>
      <JobForm
        job={job}
        departments={(departments as Department[]) ?? []}
        profiles={(profiles as Profile[]) ?? []}
        recruiterIds={recruiters?.map((r) => r.profile_id) ?? []}
      />
    </div>
  );
}
