import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/status";
import { ApprovalDecision } from "@/components/hr/approval-decision";

export const dynamic = "force-dynamic";

interface QueueRow {
  id: string;
  application_id: string;
  level: number;
  step_title: string;
  created_at: string;
  applications: {
    id: string;
    first_name: string;
    last_name: string;
    submitted_at: string;
    jobs: { title: string; departments: { name_th: string } | null } | null;
  } | null;
}

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ขั้นตอนที่รอฉันอนุมัติ
  const { data: mySteps } = await supabase
    .from("application_approvals")
    .select(
      "id, application_id, level, step_title, created_at, applications(id, first_name, last_name, submitted_at, jobs(title, departments(name_th)))"
    )
    .eq("approver_id", user?.id ?? "")
    .eq("decision", "pending")
    .order("created_at")
    .overrideTypes<QueueRow[]>();

  // เช็คว่าถึงคิวหรือยัง (ทุก level ก่อนหน้าต้อง approved แล้ว)
  const appIds = [...new Set((mySteps ?? []).map((s) => s.application_id))];
  const { data: allSteps } = appIds.length
    ? await supabase
        .from("application_approvals")
        .select("application_id, level, decision")
        .in("application_id", appIds)
    : { data: [] };

  const isMyTurn = (step: QueueRow) =>
    !(allSteps ?? []).some(
      (s) =>
        s.application_id === step.application_id &&
        s.level < step.level &&
        s.decision !== "approved"
    );

  const ready = (mySteps ?? []).filter(isMyTurn);
  const waiting = (mySteps ?? []).filter((s) => !isMyTurn(s));

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">รอฉันอนุมัติ</h1>
      <p className="mt-1 text-sm text-stone-500">
        รายการผู้สมัครที่ผ่านการสัมภาษณ์และถึงลำดับการอนุมัติของคุณ
      </p>

      <div className="mt-6 space-y-4">
        {ready.map((step) => (
          <Card key={step.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/hr/recruitment/applications/${step.application_id}`}
                  className="text-lg font-semibold text-stone-900 hover:text-emerald-700"
                >
                  {step.applications?.first_name} {step.applications?.last_name}
                </Link>
                <p className="text-sm text-stone-500">
                  ตำแหน่ง {step.applications?.jobs?.title} (
                  {step.applications?.jobs?.departments?.name_th}) · สมัครเมื่อ{" "}
                  {formatDateTime(step.applications?.submitted_at)}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-700">
                  ลำดับของคุณ: Level {step.level} — {step.step_title}
                </p>
                <Link
                  href={`/hr/recruitment/applications/${step.application_id}`}
                  className="mt-1 inline-block text-sm text-emerald-700 hover:underline"
                >
                  ดูใบสมัครฉบับเต็ม + CV →
                </Link>
              </div>
            </div>
            <ApprovalDecision stepId={step.id} />
          </Card>
        ))}
        {ready.length === 0 && (
          <Card>
            <p className="py-8 text-center text-stone-400">
              ไม่มีรายการที่รอคุณอนุมัติในขณะนี้ 🎉
            </p>
          </Card>
        )}

        {waiting.length > 0 && (
          <div>
            <h2 className="mb-2 mt-8 text-sm font-medium text-stone-500">
              กำลังรอลำดับก่อนหน้า ({waiting.length})
            </h2>
            {waiting.map((step) => (
              <Card key={step.id} className="mb-2 bg-stone-50 py-3">
                <p className="text-sm text-stone-600">
                  {step.applications?.first_name} {step.applications?.last_name} —{" "}
                  {step.applications?.jobs?.title} · Level {step.level} ของคุณจะถึงคิวเมื่อ
                  ลำดับก่อนหน้าอนุมัติแล้ว
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
