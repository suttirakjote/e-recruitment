import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/hr/employee-form";
import type { Department, Employee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: employee }, { data: departments }, { data: managers }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).single<Employee>(),
    supabase.from("departments").select("*").order("name_th"),
    supabase.from("employees").select("id, first_name, last_name").order("first_name"),
  ]);

  if (!employee) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">
        แก้ไขข้อมูล: {employee.first_name} {employee.last_name}
      </h1>
      <EmployeeForm
        employee={employee}
        departments={(departments as Department[]) ?? []}
        managers={managers ?? []}
      />
    </div>
  );
}
