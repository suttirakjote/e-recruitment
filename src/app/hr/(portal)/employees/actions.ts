"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  console.error(error);
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: string }).message)
      : fallback;
  return { ok: false, error: message };
}

function str(fd: FormData, key: string): string | null {
  const v = (fd.get(key) as string | null)?.trim();
  return v ? v : null;
}

export async function saveEmployee(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = str(formData, "id");

  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  if (!firstName || !lastName) {
    return { ok: false, error: "กรุณากรอกชื่อและนามสกุล" };
  }

  const managerId = str(formData, "manager_id");
  const payload: Record<string, unknown> = {
    employee_code: str(formData, "employee_code"),
    prefix: str(formData, "prefix"),
    first_name: firstName,
    last_name: lastName,
    first_name_en: str(formData, "first_name_en"),
    last_name_en: str(formData, "last_name_en"),
    nickname: str(formData, "nickname"),
    department_id: str(formData, "department_id"),
    position_title: str(formData, "position_title"),
    manager_id: managerId && managerId !== id ? managerId : null,
    employment_type: str(formData, "employment_type") ?? "full_time",
    status: str(formData, "status") ?? "active",
    hire_date: str(formData, "hire_date"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    national_id: str(formData, "national_id"),
    birth_date: str(formData, "birth_date"),
    gender: str(formData, "gender"),
    address: str(formData, "address"),
  };

  if (id) {
    const { error } = await supabase.from("employees").update(payload).eq("id", id);
    if (error) {
      if (error.code === "23505") return { ok: false, error: "รหัสพนักงานนี้มีอยู่แล้ว" };
      return fail(error, "บันทึกข้อมูลพนักงานไม่สำเร็จ");
    }
  } else {
    const { error } = await supabase.from("employees").insert(payload);
    if (error) {
      if (error.code === "23505") return { ok: false, error: "รหัสพนักงานนี้มีอยู่แล้ว" };
      return fail(error, "เพิ่มพนักงานไม่สำเร็จ");
    }
  }

  revalidatePath("/hr/employees");
  return { ok: true };
}

/**
 * สร้างพนักงานจากใบสมัคร (เมื่อรับเข้าทำงาน) — ดึงข้อมูลจาก form_data ของผู้สมัคร
 * เชื่อม application_id ไว้ + ตั้งสถานะทดลองงาน
 */
export async function createEmployeeFromApplication(
  applicationId: string
): Promise<ActionResult<{ employeeId: string }>> {
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("id, first_name, last_name, email, phone, form_data, job_id, jobs(title, department_id)")
    .eq("id", applicationId)
    .single();

  if (!app) return { ok: false, error: "ไม่พบใบสมัคร" };

  // กันสร้างซ้ำ
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "ใบสมัครนี้ถูกสร้างเป็นพนักงานแล้ว" };
  }

  const form = (app.form_data ?? {}) as Record<string, unknown>;
  const personal = (form.personal ?? {}) as Record<string, unknown>;
  const idCard = (personal.id_card ?? {}) as Record<string, unknown>;
  const job = app.jobs as { title?: string; department_id?: string } | null;

  const { data: emp, error } = await supabase
    .from("employees")
    .insert({
      first_name: app.first_name,
      last_name: app.last_name,
      first_name_en: (personal.name_en as string) || null,
      email: app.email,
      phone: app.phone,
      department_id: job?.department_id ?? null,
      position_title: job?.title ?? null,
      status: "probation",
      hire_date: new Date().toISOString().slice(0, 10),
      national_id: (idCard.no as string) || null,
      birth_date: (personal.birth_date as string) || null,
      gender: (personal.gender as string) || null,
      address: (personal.address_present as string) || null,
      application_id: applicationId,
      extra: form,
    })
    .select("id")
    .single();

  if (error) return fail(error, "สร้างพนักงานจากใบสมัครไม่สำเร็จ");

  // อัปเดตสถานะใบสมัครเป็น hired (trigger เขียน history ให้เอง)
  await supabase.from("applications").update({ status: "hired" }).eq("id", applicationId);

  revalidatePath("/hr/employees");
  revalidatePath(`/hr/recruitment/applications/${applicationId}`);
  return { ok: true, data: { employeeId: emp.id } };
}

/* ---------- เอกสารพนักงาน ---------- */

export async function uploadEmployeeDocument(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const employeeId = str(formData, "employee_id");
  const title = str(formData, "title");
  const docType = str(formData, "doc_type") ?? "other";
  const visible = formData.get("visible_to_employee") === "on";
  const file = formData.get("file") as File | null;

  if (!employeeId || !title) return { ok: false, error: "กรุณากรอกชื่อเอกสาร" };
  if (!file || file.size === 0) return { ok: false, error: "กรุณาเลือกไฟล์" };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "ไฟล์ต้องไม่เกิน 10MB" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${employeeId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("employee-docs")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return fail(uploadError, "อัปโหลดไฟล์ไม่สำเร็จ");

  const { error } = await supabase.from("employee_documents").insert({
    employee_id: employeeId,
    doc_type: docType,
    title,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
    visible_to_employee: visible,
    uploaded_by: user?.id,
  });
  if (error) {
    await supabase.storage.from("employee-docs").remove([path]);
    return fail(error, "บันทึกเอกสารไม่สำเร็จ");
  }

  revalidatePath(`/hr/employees/${employeeId}`);
  return { ok: true };
}

export async function deleteEmployeeDocument(
  docId: string,
  storagePath: string,
  employeeId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.storage.from("employee-docs").remove([storagePath]);
  const { error } = await supabase.from("employee_documents").delete().eq("id", docId);
  if (error) return fail(error, "ลบเอกสารไม่สำเร็จ");
  revalidatePath(`/hr/employees/${employeeId}`);
  return { ok: true };
}
