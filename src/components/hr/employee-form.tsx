"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { saveEmployee } from "@/app/hr/(portal)/employees/actions";
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_ORDER } from "@/lib/status";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/status";
import type { Department, Employee } from "@/lib/types";

interface ManagerOption {
  id: string;
  first_name: string;
  last_name: string;
}

export function EmployeeForm({
  employee,
  departments,
  managers,
}: {
  employee?: Employee;
  departments: Department[];
  managers: ManagerOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveEmployee(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/hr/employees");
    router.refresh();
  }

  return (
    <Card className="max-w-3xl">
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
        {employee && <input type="hidden" name="id" value={employee.id} />}

        <p className="sm:col-span-3 text-sm font-semibold text-emerald-800">ข้อมูลทั่วไป</p>
        <Field label="รหัสพนักงาน">
          <Input name="employee_code" defaultValue={employee?.employee_code ?? ""} placeholder="เช่น EMP001" />
        </Field>
        <Field label="คำนำหน้า">
          <Select name="prefix" defaultValue={employee?.prefix ?? ""}>
            <option value="">-</option>
            <option>นาย</option><option>นาง</option><option>นางสาว</option>
          </Select>
        </Field>
        <Field label="ชื่อเล่น">
          <Input name="nickname" defaultValue={employee?.nickname ?? ""} />
        </Field>
        <Field label="ชื่อ (ไทย)" required>
          <Input name="first_name" defaultValue={employee?.first_name ?? ""} required />
        </Field>
        <Field label="นามสกุล (ไทย)" required>
          <Input name="last_name" defaultValue={employee?.last_name ?? ""} required />
        </Field>
        <span className="hidden sm:block" />
        <Field label="ชื่อ (อังกฤษ)">
          <Input name="first_name_en" defaultValue={employee?.first_name_en ?? ""} />
        </Field>
        <Field label="นามสกุล (อังกฤษ)">
          <Input name="last_name_en" defaultValue={employee?.last_name_en ?? ""} />
        </Field>

        <p className="sm:col-span-3 mt-2 border-t border-stone-100 pt-3 text-sm font-semibold text-emerald-800">ข้อมูลการทำงาน</p>
        <Field label="แผนก">
          <Select name="department_id" defaultValue={employee?.department_id ?? ""}>
            <option value="">-</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name_th}</option>
            ))}
          </Select>
        </Field>
        <Field label="ตำแหน่ง">
          <Input name="position_title" defaultValue={employee?.position_title ?? ""} placeholder="เช่น Software Engineer" />
        </Field>
        <Field label="หัวหน้างาน (ผู้บังคับบัญชา)">
          <Select name="manager_id" defaultValue={employee?.manager_id ?? ""}>
            <option value="">-</option>
            {managers
              .filter((m) => m.id !== employee?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
          </Select>
        </Field>
        <Field label="ประเภทการจ้าง">
          <Select name="employment_type" defaultValue={employee?.employment_type ?? "full_time"}>
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="สถานะ">
          <Select name="status" defaultValue={employee?.status ?? "active"}>
            {EMPLOYEE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label="วันที่เริ่มงาน">
          <Input type="date" name="hire_date" defaultValue={employee?.hire_date ?? ""} />
        </Field>

        <p className="sm:col-span-3 mt-2 border-t border-stone-100 pt-3 text-sm font-semibold text-emerald-800">ข้อมูลติดต่อ & ส่วนตัว</p>
        <Field label="อีเมล">
          <Input type="email" name="email" defaultValue={employee?.email ?? ""} />
        </Field>
        <Field label="เบอร์โทร">
          <Input name="phone" defaultValue={employee?.phone ?? ""} />
        </Field>
        <Field label="เลขบัตรประชาชน">
          <Input name="national_id" defaultValue={employee?.national_id ?? ""} maxLength={13} />
        </Field>
        <Field label="วันเกิด">
          <Input type="date" name="birth_date" defaultValue={employee?.birth_date ?? ""} />
        </Field>
        <Field label="เพศ">
          <Select name="gender" defaultValue={employee?.gender ?? ""}>
            <option value="">-</option>
            <option value="male">ชาย</option>
            <option value="female">หญิง</option>
          </Select>
        </Field>
        <span className="hidden sm:block" />
        <Field label="ที่อยู่" className="sm:col-span-3">
          <Input name="address" defaultValue={employee?.address ?? ""} />
        </Field>

        {error && <p className="text-sm text-rose-600 sm:col-span-3">{error}</p>}
        <div className="flex gap-3 sm:col-span-3">
          <Button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลพนักงาน"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </Card>
  );
}
