import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/hr/job-form";
import type { Department, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const supabase = await createClient();
  const [{ data: departments }, { data: profiles }] = await Promise.all([
    supabase.from("departments").select("*").order("name_th"),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">สร้างตำแหน่งใหม่</h1>
      <JobForm
        departments={(departments as Department[]) ?? []}
        profiles={(profiles as Profile[]) ?? []}
      />
    </div>
  );
}
