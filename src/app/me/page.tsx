import { getMyEmployee } from "@/lib/auth";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/hr/avatar";
import {
  EMPLOYEE_STATUS_COLORS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  formatDate,
  type EmployeeStatus,
} from "@/lib/status";
import { SignOutButton } from "@/components/hr/sign-out-button";

export const dynamic = "force-dynamic";

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="text-sm text-stone-800">{value || "-"}</dd>
    </div>
  );
}

interface EmpRow {
  first_name: string;
  last_name: string;
  prefix: string | null;
  nickname: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  employee_code: string | null;
  position_title: string | null;
  employment_type: string;
  status: EmployeeStatus;
  hire_date: string | null;
  email: string | null;
  phone: string | null;
  photo_path: string | null;
  departments: { name_th: string } | null;
  manager: { first_name: string; last_name: string } | null;
}

export default async function MyProfilePage() {
  const { profile, employee } = await getMyEmployee();

  if (!profile) return null;

  if (!employee) {
    return (
      <Card>
        <p className="text-stone-700">
          บัญชีของคุณยังไม่ได้เชื่อมกับข้อมูลพนักงาน
        </p>
        <p className="mt-1 text-sm text-stone-500">
          กรุณาติดต่อฝ่ายบุคคลเพื่อผูกบัญชีกับข้อมูลพนักงานของคุณ
        </p>
        <div className="mt-4 w-32 rounded-lg bg-stone-900 text-center">
          <SignOutButton />
        </div>
      </Card>
    );
  }

  const e = employee as unknown as EmpRow;
  const fullName = `${e.prefix ?? ""}${e.first_name} ${e.last_name}`;

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar photoPath={e.photo_path} name={fullName} size={64} />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-900">{fullName}</h1>
            <Badge className={EMPLOYEE_STATUS_COLORS[e.status]}>
              {EMPLOYEE_STATUS_LABELS[e.status]}
            </Badge>
          </div>
          <p className="text-sm text-stone-500">
            {e.position_title ?? "-"}
            {e.departments?.name_th ? ` · ${e.departments.name_th}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <SectionTitle>ข้อมูลการทำงาน</SectionTitle>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="รหัสพนักงาน" value={e.employee_code} />
            <Item label="ตำแหน่ง" value={e.position_title} />
            <Item label="แผนก" value={e.departments?.name_th} />
            <Item label="ประเภทการจ้าง" value={EMPLOYMENT_TYPE_LABELS[e.employment_type] ?? e.employment_type} />
            <Item label="หัวหน้างาน" value={e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : "-"} />
            <Item label="วันที่เริ่มงาน" value={formatDate(e.hire_date)} />
          </dl>
        </Card>

        <Card>
          <SectionTitle>ข้อมูลติดต่อ</SectionTitle>
          <dl className="grid gap-4">
            <Item label="ชื่อเล่น" value={e.nickname} />
            <Item label="ชื่อ (อังกฤษ)" value={[e.first_name_en, e.last_name_en].filter(Boolean).join(" ")} />
            <Item label="อีเมล" value={e.email} />
            <Item label="เบอร์โทร" value={e.phone} />
          </dl>
          <p className="mt-4 text-xs text-stone-400">
            หากข้อมูลไม่ถูกต้อง กรุณาแจ้งฝ่ายบุคคลเพื่อแก้ไข
          </p>
        </Card>
      </div>

      <Card className="mt-6 bg-stone-50/60">
        <p className="text-sm text-stone-500">
          เมนูอื่นๆ (การลา, เอกสาร, ลงเวลา) จะเปิดให้ใช้งานเร็วๆ นี้
        </p>
      </Card>
    </div>
  );
}
