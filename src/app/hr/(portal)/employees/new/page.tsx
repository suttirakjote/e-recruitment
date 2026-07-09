import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/hr/employee-form";
import type { Department } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const supabase = await createClient();
  const [{ data: departments }, { data: managers }] = await Promise.all([
    supabase.from("departments").select("*").order("name_th"),
    supabase.from("employees").select("id, first_name, last_name").order("first_name"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">เพิ่มพนักงานใหม่</h1>
      <EmployeeForm
        departments={(departments as Department[]) ?? []}
        managers={managers ?? []}
      />
    </div>
  );
}
