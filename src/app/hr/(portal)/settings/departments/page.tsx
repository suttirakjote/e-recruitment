import { createClient } from "@/lib/supabase/server";
import { DepartmentManager } from "@/components/hr/department-manager";
import type { Department } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DepartmentsSettingsPage() {
  const supabase = await createClient();
  const [{ data: departments }, { data: flows }] = await Promise.all([
    supabase.from("departments").select("*").order("name_th"),
    supabase
      .from("approval_flows")
      .select("department_id, approval_flow_steps(id)")
      .eq("is_active", true),
  ]);

  const flowCounts: Record<string, number> = {};
  for (const f of flows ?? []) {
    flowCounts[f.department_id] =
      (f.approval_flow_steps as { id: string }[] | null)?.length ?? 0;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">แผนก & สายอนุมัติ</h1>
      <DepartmentManager
        departments={(departments as Department[]) ?? []}
        flowCounts={flowCounts}
      />
    </div>
  );
}
