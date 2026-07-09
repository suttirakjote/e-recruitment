import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/hr/avatar";
import { EmployeeDocuments, type DocItem } from "@/components/hr/employee-documents";
import { getProfile, isAdmin } from "@/lib/auth";
import {
  EMPLOYEE_STATUS_COLORS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  formatDate,
} from "@/lib/status";
import type { Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="text-sm text-stone-800">{value || "-"}</dd>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: emp } = await supabase
    .from("employees")
    .select("*, departments(name_th), manager:manager_id(first_name, last_name)")
    .eq("id", id)
    .single<Employee>();

  if (!emp) notFound();

  // ค่าตอบแทน (เฉพาะ admin — RLS จะคืน null ให้คนอื่น)
  let compensation: { base_salary: number | null; bank_name: string | null; bank_account: string | null } | null = null;
  if (profile && isAdmin(profile)) {
    const { data } = await supabase
      .from("employee_compensation")
      .select("base_salary, bank_name, bank_account")
      .eq("employee_id", id)
      .maybeSingle();
    compensation = data;
  }

  // เอกสารพนักงาน + signed URL
  const { data: docs } = await supabase
    .from("employee_documents")
    .select("id, doc_type, title, storage_path, file_name, visible_to_employee, uploaded_at")
    .eq("employee_id", id)
    .order("uploaded_at", { ascending: false });
  const documents: DocItem[] = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await supabase.storage
        .from("employee-docs")
        .createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  const fullName = `${emp.prefix ?? ""}${emp.first_name} ${emp.last_name}`;

  return (
    <div>
      <Link href="/hr/employees" className="text-sm text-stone-500 hover:text-emerald-700">
        ← ทำเนียบพนักงาน
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar photoPath={emp.photo_path} name={fullName} size={64} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-stone-900">{fullName}</h1>
              <Badge className={EMPLOYEE_STATUS_COLORS[emp.status]}>
                {EMPLOYEE_STATUS_LABELS[emp.status]}
              </Badge>
            </div>
            <p className="text-sm text-stone-500">
              {emp.position_title ?? "-"}
              {emp.departments?.name_th ? ` · ${emp.departments.name_th}` : ""}
              {emp.employee_code ? ` · ${emp.employee_code}` : ""}
            </p>
          </div>
        </div>
        <Link href={`/hr/employees/${emp.id}/edit`}
          className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200">
          แก้ไขข้อมูล
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>ข้อมูลการทำงาน</SectionTitle>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="ตำแหน่ง" value={emp.position_title} />
            <Item label="แผนก" value={emp.departments?.name_th} />
            <Item label="ประเภทการจ้าง" value={EMPLOYMENT_TYPE_LABELS[emp.employment_type] ?? emp.employment_type} />
            <Item label="หัวหน้างาน" value={emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : "-"} />
            <Item label="วันที่เริ่มงาน" value={formatDate(emp.hire_date)} />
            <Item label="รหัสพนักงาน" value={emp.employee_code} />
          </dl>
        </Card>

        <Card>
          <SectionTitle>ข้อมูลติดต่อ & ส่วนตัว</SectionTitle>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="ชื่อ (อังกฤษ)" value={[emp.first_name_en, emp.last_name_en].filter(Boolean).join(" ")} />
            <Item label="ชื่อเล่น" value={emp.nickname} />
            <Item label="อีเมล" value={emp.email} />
            <Item label="เบอร์โทร" value={emp.phone} />
            <Item label="เลขบัตรประชาชน" value={emp.national_id} />
            <Item label="วันเกิด" value={formatDate(emp.birth_date)} />
            <Item label="เพศ" value={emp.gender === "male" ? "ชาย" : emp.gender === "female" ? "หญิง" : "-"} />
            <Item label="ที่อยู่" value={emp.address} />
          </dl>
        </Card>

        {compensation && (
          <Card className="lg:col-span-2 border-amber-200 bg-amber-50/40">
            <SectionTitle>ค่าตอบแทน (เฉพาะผู้ดูแลระบบ)</SectionTitle>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Item label="เงินเดือนฐาน" value={compensation.base_salary ? compensation.base_salary.toLocaleString("th-TH") + " บาท" : "-"} />
              <Item label="ธนาคาร" value={compensation.bank_name} />
              <Item label="เลขบัญชี" value={compensation.bank_account} />
            </dl>
          </Card>
        )}

        <Card className="lg:col-span-2">
          <SectionTitle>เอกสารพนักงาน</SectionTitle>
          <EmployeeDocuments employeeId={emp.id} documents={documents} />
        </Card>

        {emp.application_id && (
          <Card className="lg:col-span-2">
            <p className="text-sm text-stone-500">
              พนักงานคนนี้รับเข้าจากใบสมัคร ·{" "}
              <Link href={`/hr/recruitment/applications/${emp.application_id}`}
                className="text-emerald-700 hover:underline">
                ดูใบสมัครต้นทาง →
              </Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
