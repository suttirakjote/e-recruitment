import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplyForm } from "@/components/apply/apply-form";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: job }, { data: otherJobs }] = await Promise.all([
    supabase.from("jobs").select("id, title").eq("id", id).eq("status", "open").single(),
    supabase.from("jobs").select("id, title").eq("status", "open").neq("id", id).order("title"),
  ]);

  if (!job) notFound();

  return <ApplyForm jobId={job.id} jobTitle={job.title} otherJobs={otherJobs ?? []} />;
}
