"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { deleteDepartment, saveDepartment } from "@/app/hr/(portal)/settings/actions";
import type { Department } from "@/lib/types";

export function DepartmentManager({
  departments,
  flowCounts,
}: {
  departments: Department[];
  flowCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await saveDepartment(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-semibold text-stone-800">เพิ่มแผนกใหม่</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <Input name="code" placeholder="รหัส เช่น IT" className="w-28" required />
          <Input name="name_th" placeholder="ชื่อแผนก (ไทย)" className="w-56" required />
          <Input name="name_en" placeholder="ชื่อแผนก (อังกฤษ)" className="w-56" />
          <Button type="submit" disabled={pending}>+ เพิ่มแผนก</Button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-6 py-3 font-medium">รหัส</th>
              <th className="px-4 py-3 font-medium">ชื่อแผนก</th>
              <th className="px-4 py-3 font-medium">สายอนุมัติ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <DepartmentRow key={d.id} dept={d} flowCount={flowCounts[d.id] ?? 0} />
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-stone-400">
                  ยังไม่มีแผนก — เพิ่มแผนกแรกด้านบน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function DepartmentRow({ dept, flowCount }: { dept: Department; flowCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(dept.code);
  const [nameTh, setNameTh] = useState(dept.name_th);
  const [nameEn, setNameEn] = useState(dept.name_en ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", dept.id);
      fd.set("code", code);
      fd.set("name_th", nameTh);
      fd.set("name_en", nameEn);
      const result = await saveDepartment(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-stone-100 bg-amber-50/40 last:border-0">
        <td className="px-6 py-3">
          <Input value={code} onChange={(e) => setCode(e.target.value)} className="w-24" />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <Input value={nameTh} onChange={(e) => setNameTh(e.target.value)} placeholder="ชื่อไทย" />
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="ชื่ออังกฤษ" />
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-stone-400">—</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <Button variant="primary" className="px-3 py-1.5 text-xs" disabled={pending} onClick={save}>
              {pending ? "..." : "บันทึก"}
            </Button>
            <button
              className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-200"
              onClick={() => {
                setCode(dept.code);
                setNameTh(dept.name_th);
                setNameEn(dept.name_en ?? "");
                setError(null);
                setEditing(false);
              }}
            >
              ยกเลิก
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-stone-100 last:border-0">
      <td className="px-6 py-3 font-mono text-stone-600">{dept.code}</td>
      <td className="px-4 py-3 font-medium text-stone-800">
        {dept.name_th}
        {dept.name_en && <span className="ml-2 text-xs text-stone-400">{dept.name_en}</span>}
      </td>
      <td className="px-4 py-3">
        {flowCount ? (
          <span className="text-emerald-700">✓ {flowCount} ระดับ</span>
        ) : (
          <span className="text-amber-600">ยังไม่ตั้งค่า</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200"
            onClick={() => setEditing(true)}
          >
            แก้ไข
          </button>
          <Link
            href={`/hr/settings/departments/${dept.id}`}
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            ตั้งค่าสายอนุมัติ
          </Link>
          <button
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-500 hover:bg-rose-50 hover:text-rose-600"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!confirm(`ลบแผนก ${dept.name_th}?`)) return;
                const result = await deleteDepartment(dept.id);
                if (!result.ok) setError(result.error);
                else router.refresh();
              })
            }
          >
            ลบ
          </button>
        </div>
        {error && <p className="mt-1 text-right text-xs text-rose-600">{error}</p>}
      </td>
    </tr>
  );
}
