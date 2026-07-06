import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import { Avatar } from "@/components/hr/avatar";
import { formatDateTime } from "@/lib/status";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  application_id: string;
  level: number;
  step_title: string;
  decision: "pending" | "approved" | "rejected";
  decided_at: string | null;
  comment: string | null;
  profiles: { full_name: string; photo_path: string | null } | null;
  applications: {
    id: string;
    first_name: string;
    last_name: string;
    status: string;
    submitted_at: string;
    jobs: { title: string; departments: { name_th: string } | null } | null;
  } | null;
}

interface Group {
  application_id: string;
  applicant: string;
  jobTitle: string;
  deptName: string;
  status: string;
  steps: Row[];
}

export default async function ApprovalProcessPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_approvals")
    .select(
      "id, application_id, level, step_title, decision, decided_at, comment, profiles:approver_id(full_name, photo_path), applications(id, first_name, last_name, status, submitted_at, jobs(title, departments(name_th)))"
    )
    .order("application_id")
    .order("level")
    .overrideTypes<Row[]>();

  // จัดกลุ่มตามใบสมัคร
  const groupMap = new Map<string, Group>();
  for (const row of data ?? []) {
    if (!groupMap.has(row.application_id)) {
      groupMap.set(row.application_id, {
        application_id: row.application_id,
        applicant: `${row.applications?.first_name ?? ""} ${row.applications?.last_name ?? ""}`.trim(),
        jobTitle: row.applications?.jobs?.title ?? "-",
        deptName: row.applications?.jobs?.departments?.name_th ?? "-",
        status: row.applications?.status ?? "",
        steps: [],
      });
    }
    groupMap.get(row.application_id)!.steps.push(row);
  }

  const groups = [...groupMap.values()];
  const inProgress = groups.filter((g) => g.status === "pending_approval");
  const done = groups.filter((g) => g.status !== "pending_approval");

  // level ปัจจุบันที่รออยู่ = level แรกที่ยัง pending และ level ก่อนหน้าอนุมัติหมดแล้ว
  const currentLevel = (steps: Row[]): number | null => {
    for (const s of steps) {
      if (s.decision === "pending") return s.level;
      if (s.decision === "rejected") return null;
    }
    return null;
  };

  const renderStepper = (g: Group) => {
    const current = currentLevel(g.steps);
    return (
      <div className="flex flex-wrap items-stretch gap-2">
        {g.steps.map((s, i) => {
          const isCurrent = s.level === current;
          const border =
            s.decision === "approved"
              ? "border-emerald-300 bg-emerald-50"
              : s.decision === "rejected"
                ? "border-rose-300 bg-rose-50"
                : isCurrent
                  ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                  : "border-stone-200 bg-stone-50";
          const statusText =
            s.decision === "approved"
              ? `อนุมัติ · ${formatDateTime(s.decided_at)}`
              : s.decision === "rejected"
                ? `ไม่อนุมัติ · ${formatDateTime(s.decided_at)}`
                : isCurrent
                  ? "⏳ อยู่ระหว่างพิจารณา"
                  : "รอลำดับก่อนหน้า";
          return (
            <div key={s.id} className="flex items-center">
              <div className={`w-52 rounded-lg border p-3 ${border}`}>
                <p className="text-xs font-medium text-stone-400">
                  Level {s.level} · {s.step_title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar photoPath={s.profiles?.photo_path} name={s.profiles?.full_name ?? "?"} size={32} />
                  <span className="text-sm font-medium text-stone-800">
                    {s.profiles?.full_name}
                  </span>
                </div>
                <p
                  className={`mt-1 text-xs ${
                    s.decision === "approved"
                      ? "text-emerald-700"
                      : s.decision === "rejected"
                        ? "text-rose-600"
                        : isCurrent
                          ? "font-medium text-amber-700"
                          : "text-stone-400"
                  }`}
                >
                  {statusText}
                </p>
                {s.comment && (
                  <p className="mt-1 rounded bg-white/70 px-1.5 py-0.5 text-xs text-stone-500">
                    &quot;{s.comment}&quot;
                  </p>
                )}
              </div>
              {i < g.steps.length - 1 && <span className="px-1 text-stone-300">→</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">สถานะการอนุมัติ</h1>
      <p className="mt-1 text-sm text-stone-500">
        ภาพรวมใบสมัครที่อยู่ในกระบวนการอนุมัติ — เห็นได้ว่าแต่ละใบอยู่ที่ผู้อนุมัติคนใดแล้ว
      </p>

      <h2 className="mb-3 mt-6 text-sm font-semibold text-stone-500">
        กำลังดำเนินการ ({inProgress.length})
      </h2>
      <div className="space-y-4">
        {inProgress.map((g) => (
          <Card key={g.application_id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link
                  href={`/hr/applications/${g.application_id}`}
                  className="font-semibold text-stone-900 hover:text-emerald-700"
                >
                  {g.applicant}
                </Link>
                <p className="text-sm text-stone-500">
                  {g.jobTitle} · {g.deptName}
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-800">รออนุมัติ</Badge>
            </div>
            {renderStepper(g)}
          </Card>
        ))}
        {inProgress.length === 0 && (
          <Card>
            <p className="py-8 text-center text-stone-400">
              ไม่มีใบสมัครที่อยู่ระหว่างการอนุมัติในขณะนี้
            </p>
          </Card>
        )}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-stone-500">
            เสร็จสิ้นแล้ว ({done.length})
          </h2>
          <div className="space-y-4">
            {done.map((g) => (
              <Card key={g.application_id} className="bg-stone-50/60">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/hr/applications/${g.application_id}`}
                      className="font-semibold text-stone-900 hover:text-emerald-700"
                    >
                      {g.applicant}
                    </Link>
                    <p className="text-sm text-stone-500">
                      {g.jobTitle} · {g.deptName}
                    </p>
                  </div>
                  <Badge
                    className={
                      g.status === "rejected"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }
                  >
                    {g.status === "rejected" ? "ไม่อนุมัติ" : "อนุมัติแล้ว"}
                  </Badge>
                </div>
                {renderStepper(g)}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
