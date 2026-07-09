"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { saveJob } from "@/app/hr/(portal)/actions";
import type { Department, Job, Profile } from "@/lib/types";

export function JobForm({
  job,
  departments,
  profiles,
  recruiterIds,
}: {
  job?: Job;
  departments: Department[];
  profiles: Profile[];
  recruiterIds?: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveJob(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/hr/recruitment/jobs");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {job && <input type="hidden" name="id" value={job.id} />}
        <Field label="ชื่อตำแหน่ง" required className="sm:col-span-2">
          <Input name="title" defaultValue={job?.title} required />
        </Field>
        <Field label="แผนก" required>
          <Select name="department_id" defaultValue={job?.department_id ?? ""} required>
            <option value="">เลือกแผนก</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name_th}</option>
            ))}
          </Select>
        </Field>
        <Field label="ประเภทการจ้าง">
          <Select name="employment_type" defaultValue={job?.employment_type ?? "full_time"}>
            <option value="full_time">พนักงานประจำ</option>
            <option value="part_time">พาร์ทไทม์</option>
            <option value="contract">สัญญาจ้าง</option>
            <option value="intern">ฝึกงาน</option>
          </Select>
        </Field>
        <Field label="สถานที่ปฏิบัติงาน">
          <Input name="location" defaultValue={job?.location ?? ""} />
        </Field>
        <Field label="ช่วงเงินเดือน (แสดงให้ผู้สมัครเห็น)">
          <Input name="salary_range" defaultValue={job?.salary_range ?? ""}
            placeholder="เช่น 25,000 - 35,000 บาท หรือ ตามตกลง" />
        </Field>
        <Field label="จำนวนที่รับ (คน)">
          <Input name="openings" type="number" min={1} defaultValue={job?.openings ?? 1} />
        </Field>
        <Field label="สถานะ">
          <Select name="status" defaultValue={job?.status ?? "draft"}>
            <option value="draft">ฉบับร่าง (ยังไม่แสดง)</option>
            <option value="open">เปิดรับสมัคร</option>
            <option value="on_hold">พักชั่วคราว</option>
            <option value="closed">ปิดรับสมัคร</option>
          </Select>
        </Field>
        <Field label="รายละเอียดงาน" className="sm:col-span-2">
          <Textarea name="description" rows={5} defaultValue={job?.description ?? ""} />
        </Field>
        <Field label="คุณสมบัติผู้สมัคร" className="sm:col-span-2">
          <Textarea name="requirements" rows={5} defaultValue={job?.requirements ?? ""} />
        </Field>
        <Field label="HR ผู้รับผิดชอบ (รับอีเมลแจ้งเตือนเมื่อมีใบสมัครใหม่)"
          className="sm:col-span-2">
          <div className="grid gap-1.5 rounded-lg border border-stone-200 p-3 sm:grid-cols-2">
            {profiles.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="recruiters" value={p.id}
                  defaultChecked={recruiterIds?.includes(p.id)} />
                {p.full_name} <span className="text-xs text-stone-400">({p.email})</span>
              </label>
            ))}
            {profiles.length === 0 && (
              <p className="text-sm text-stone-400">ยังไม่มีผู้ใช้ HR ในระบบ</p>
            )}
          </div>
        </Field>
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกตำแหน่ง"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </Card>
  );
}
