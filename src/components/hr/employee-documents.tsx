"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select } from "@/components/ui";
import {
  deleteEmployeeDocument,
  uploadEmployeeDocument,
} from "@/app/hr/(portal)/employees/actions";
import { formatDate } from "@/lib/status";

export interface DocItem {
  id: string;
  doc_type: string;
  title: string;
  storage_path: string;
  file_name: string;
  visible_to_employee: boolean;
  uploaded_at: string;
  url: string | null;
}

const DOC_TYPES: Record<string, string> = {
  contract: "สัญญาจ้าง",
  id_card: "บัตรประชาชน/ทะเบียนบ้าน",
  certificate: "วุฒิการศึกษา/ใบรับรอง",
  evaluation: "ผลประเมิน",
  other: "อื่นๆ",
};

export function EmployeeDocuments({
  employeeId,
  documents,
}: {
  employeeId: string;
  documents: DocItem[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadEmployeeDocument(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div>
      <form ref={formRef} onSubmit={handleUpload} className="grid gap-3 rounded-lg border border-stone-200 p-4 sm:grid-cols-2">
        <input type="hidden" name="employee_id" value={employeeId} />
        <Field label="ชื่อเอกสาร" required>
          <Input name="title" required placeholder="เช่น สัญญาจ้างงาน 2568" />
        </Field>
        <Field label="ประเภท">
          <Select name="doc_type" defaultValue="other">
            {Object.entries(DOC_TYPES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="ไฟล์ (≤ 10MB)" required className="sm:col-span-2">
          <Input type="file" name="file" required
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-stone-600 sm:col-span-2">
          <input type="checkbox" name="visible_to_employee" defaultChecked />
          ให้พนักงานเห็นเอกสารนี้ในระบบ (ถ้าไม่ติ๊ก = เอกสารภายในสำหรับ HR เท่านั้น)
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "กำลังอัปโหลด..." : "+ อัปโหลดเอกสาร"}
          </Button>
        </div>
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
      </form>

      <ul className="mt-4 divide-y divide-stone-100">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-emerald-700 hover:underline">
                    {d.title}
                  </a>
                ) : (
                  <span className="truncate text-sm font-medium text-stone-700">{d.title}</span>
                )}
                {!d.visible_to_employee && (
                  <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">
                    ภายใน
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                {DOC_TYPES[d.doc_type] ?? d.doc_type} · {d.file_name} · {formatDate(d.uploaded_at)}
              </p>
            </div>
            <button
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-stone-500 hover:bg-rose-50 hover:text-rose-600"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (!confirm(`ลบเอกสาร "${d.title}"?`)) return;
                  await deleteEmployeeDocument(d.id, d.storage_path, employeeId);
                  router.refresh();
                })
              }
            >
              ลบ
            </button>
          </li>
        ))}
        {documents.length === 0 && (
          <li className="py-6 text-center text-sm text-stone-400">ยังไม่มีเอกสาร</li>
        )}
      </ul>
    </div>
  );
}
