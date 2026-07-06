"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Select, Input } from "@/components/ui";
import { saveApprovalFlow } from "@/app/hr/(portal)/settings/actions";
import type { Profile } from "@/lib/types";

interface StepRow {
  step_title: string;
  approver_id: string;
}

export function FlowEditor({
  departmentId,
  departmentName,
  initialSteps,
  profiles,
}: {
  departmentId: string;
  departmentName: string;
  initialSteps: StepRow[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<StepRow[]>(
    initialSteps.length ? initialSteps : [{ step_title: "", approver_id: "" }]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(i: number, field: keyof StepRow, value: string) {
    setSteps((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function move(i: number, dir: -1 | 1) {
    setSteps((s) => {
      const next = [...s];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <Card className="max-w-2xl">
      <p className="mb-4 text-sm text-stone-500">
        ผู้สมัครของแผนก <b>{departmentName}</b> ต้องผ่านการอนุมัติตามลำดับด้านล่าง
        (Level 1 → Level สุดท้าย) การแก้ไขไม่มีผลกับใบสมัครที่กำลังอยู่ระหว่างการอนุมัติ
      </p>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-sm font-medium text-stone-500">
              Level {i + 1}
            </span>
            <Input
              placeholder='ชื่อขั้นตอน เช่น "IT Manager"'
              value={step.step_title}
              onChange={(e) => update(i, "step_title", e.target.value)}
            />
            <Select
              value={step.approver_id}
              onChange={(e) => update(i, "approver_id", e.target.value)}
            >
              <option value="">เลือกผู้อนุมัติ</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} {p.job_title ? `(${p.job_title})` : ""}
                </option>
              ))}
            </Select>
            <div className="flex shrink-0 gap-1">
              <button type="button" className="rounded px-1.5 py-1 text-stone-400 hover:bg-stone-100"
                onClick={() => move(i, -1)} title="เลื่อนขึ้น">↑</button>
              <button type="button" className="rounded px-1.5 py-1 text-stone-400 hover:bg-stone-100"
                onClick={() => move(i, 1)} title="เลื่อนลง">↓</button>
              <button type="button" className="rounded px-1.5 py-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => setSteps((s) => s.filter((_, idx) => idx !== i))}
                title="ลบ">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" type="button"
          onClick={() => setSteps((s) => [...s, { step_title: "", approver_id: "" }])}>
          + เพิ่มระดับ
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveApprovalFlow(departmentId, steps);
              if (!result.ok) {
                setError(result.error);
                setMessage(null);
                return;
              }
              setError(null);
              setMessage("บันทึกสายอนุมัติแล้ว");
              router.refresh();
            })
          }
        >
          {pending ? "กำลังบันทึก..." : "บันทึกสายอนุมัติ"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
    </Card>
  );
}
