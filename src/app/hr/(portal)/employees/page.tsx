import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui";
import { Avatar } from "@/components/hr/avatar";
import {
  EMPLOYEE_STATUS_COLORS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_ORDER,
  type EmployeeStatus,
} from "@/lib/status";
import type { Department, Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; dept?: string; q?: string }>;
}) {
  const { status, dept, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select("*, departments(name_th)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status) query = query.eq("status", status);
  if (dept) query = query.eq("department_id", dept);
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,employee_code.ilike.%${q}%`);

  const [{ data: employees }, { data: departments }] = await Promise.all([
    query.overrideTypes<Employee[]>(),
    supabase.from("departments").select("*").order("name_th"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ทำเนียบพนักงาน</h1>
          <p className="text-sm text-stone-500">พนักงานทั้งหมด {employees?.length ?? 0} คน</p>
        </div>
        <div className="flex gap-2">
          <Link href="/hr/employees/org-chart"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            ผังองค์กร
          </Link>
          <Link href="/hr/employees/new"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            + เพิ่มพนักงาน
          </Link>
        </div>
      </div>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={q ?? ""} placeholder="ค้นหาชื่อ / รหัส"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm" />
        <select name="dept" defaultValue={dept ?? ""}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
          <option value="">ทุกแผนก</option>
          {(departments as Department[] | null)?.map((d) => (
            <option key={d.id} value={d.id}>{d.name_th}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
          <option value="">ทุกสถานะ</option>
          {EMPLOYEE_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button className="rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700">
          กรอง
        </button>
        {(status || dept || q) && (
          <Link href="/hr/employees" className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100">
            ล้าง
          </Link>
        )}
      </form>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-6 py-3 font-medium">พนักงาน</th>
              <th className="px-4 py-3 font-medium">รหัส</th>
              <th className="px-4 py-3 font-medium">ตำแหน่ง</th>
              <th className="px-4 py-3 font-medium">แผนก</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((e) => (
              <tr key={e.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                <td className="px-6 py-3">
                  <Link href={`/hr/employees/${e.id}`} className="flex items-center gap-3">
                    <Avatar photoPath={e.photo_path} name={`${e.first_name} ${e.last_name}`} size={36} />
                    <span className="font-medium text-stone-800 hover:text-emerald-700">
                      {e.prefix ?? ""}{e.first_name} {e.last_name}
                      {e.nickname && <span className="ml-1 text-xs text-stone-400">({e.nickname})</span>}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-stone-500">{e.employee_code ?? "-"}</td>
                <td className="px-4 py-3 text-stone-600">{e.position_title ?? "-"}</td>
                <td className="px-4 py-3 text-stone-600">{e.departments?.name_th ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge className={EMPLOYEE_STATUS_COLORS[e.status]}>
                    {EMPLOYEE_STATUS_LABELS[e.status as EmployeeStatus]}
                  </Badge>
                </td>
              </tr>
            ))}
            {(!employees || employees.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                  ยังไม่มีพนักงาน — กด &quot;เพิ่มพนักงาน&quot; หรือรับเข้าจากใบสมัคร
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
