import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlowEditor } from "@/components/hr/flow-editor";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DepartmentFlowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: department }, { data: flow }, { data: profiles }] =
    await Promise.all([
      supabase.from("departments").select("*").eq("id", id).single(),
      supabase
        .from("approval_flows")
        .select("id, approval_flow_steps(level, step_title, approver_id)")
        .eq("department_id", id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    ]);

  if (!department) notFound();

  const steps =
    (flow?.approval_flow_steps as
      | { level: number; step_title: string; approver_id: string }[]
      | null) ?? [];
  steps.sort((a, b) => a.level - b.level);

  return (
    <div>
      <Link href="/hr/settings/departments"
        className="text-sm text-stone-500 hover:text-emerald-700">
        ← แผนกทั้งหมด
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-bold text-stone-900">
        สายอนุมัติ: แผนก{department.name_th}
      </h1>
      <FlowEditor
        departmentId={id}
        departmentName={department.name_th}
        initialSteps={steps.map((s) => ({
          step_title: s.step_title,
          approver_id: s.approver_id,
        }))}
        profiles={(profiles as Profile[]) ?? []}
      />
    </div>
  );
}
