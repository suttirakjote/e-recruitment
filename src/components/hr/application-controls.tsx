"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type ApplicationStatus,
} from "@/lib/status";
import {
  addNote,
  startApproval,
  updateApplicationStatus,
} from "@/app/hr/(portal)/actions";

export function StatusControl({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
}) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [publicNote, setPublicNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Field label="เปลี่ยนสถานะใบสมัคร">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_ORDER.filter((s) => s !== "pending_approval" && s !== "approved").map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </Field>
      <Field label="ข้อความถึงผู้สมัคร (แสดงในหน้าติดตามสถานะ — ไม่บังคับ)">
        <Input value={publicNote} onChange={(e) => setPublicNote(e.target.value)}
          placeholder="เช่น นัดสัมภาษณ์วันที่ 15 ก.ค. เวลา 10:00 น." />
      </Field>
      <Button
        disabled={pending || status === currentStatus}
        onClick={() =>
          startTransition(async () => {
            const result = await updateApplicationStatus(applicationId, status, publicNote);
            setMessage(result.ok ? "บันทึกแล้ว" : result.error);
            if (result.ok) setPublicNote("");
          })
        }
      >
        {pending ? "กำลังบันทึก..." : "บันทึกสถานะ"}
      </Button>
      {message && <p className="text-sm text-stone-500">{message}</p>}
    </div>
  );
}

export function StartApprovalButton({
  applicationId,
  disabled,
}: {
  applicationId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
        disabled={pending || disabled}
        onClick={() =>
          startTransition(async () => {
            const result = await startApproval(applicationId);
            if (!result.ok) setError(result.error);
          })
        }
      >
        {pending ? "กำลังส่ง..." : "ส่งเข้าสายอนุมัติรับเข้าทำงาน"}
      </Button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function NoteForm({ applicationId }: { applicationId: string }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="บันทึกภายใน เช่น ผลสัมภาษณ์ ความเห็นของกรรมการ (ผู้สมัครไม่เห็นข้อความนี้)" />
      <Button
        variant="secondary"
        disabled={pending || !body.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await addNote(applicationId, body);
            if (result.ok) setBody("");
          })
        }
      >
        {pending ? "กำลังบันทึก..." : "เพิ่มโน้ต"}
      </Button>
    </div>
  );
}
