"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/* ---------- แผนก ---------- */

export async function saveDepartment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = (formData.get("id") as string) || null;
  const payload = {
    code: (formData.get("code") as string)?.trim().toUpperCase(),
    name_th: (formData.get("name_th") as string)?.trim(),
    name_en: (formData.get("name_en") as string)?.trim() || null,
  };
  if (!payload.code || !payload.name_th) {
    return { ok: false, error: "กรุณากรอกรหัสและชื่อแผนก" };
  }

  const { error } = id
    ? await supabase.from("departments").update(payload).eq("id", id)
    : await supabase.from("departments").insert(payload);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "รหัสแผนกนี้มีอยู่แล้ว" };
    console.error(error);
    return { ok: false, error: "บันทึกแผนกไม่สำเร็จ" };
  }
  revalidatePath("/hr/settings/departments");
  return { ok: true };
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error: "ลบไม่สำเร็จ — แผนกนี้มีตำแหน่งงานหรือข้อมูลที่เชื่อมโยงอยู่",
    };
  }
  revalidatePath("/hr/settings/departments");
  return { ok: true };
}

/* ---------- สายอนุมัติของแผนก ---------- */

export async function saveApprovalFlow(
  departmentId: string,
  steps: { step_title: string; approver_id: string }[]
): Promise<ActionResult> {
  if (steps.length === 0) return { ok: false, error: "กรุณาเพิ่มขั้นตอนอย่างน้อย 1 ระดับ" };
  if (steps.some((s) => !s.step_title.trim() || !s.approver_id)) {
    return { ok: false, error: "กรุณากรอกชื่อขั้นตอนและเลือกผู้อนุมัติให้ครบทุกระดับ" };
  }

  const supabase = await createClient();

  // หา flow ที่ active อยู่ หรือสร้างใหม่
  const { data: existing } = await supabase
    .from("approval_flows")
    .select("id")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .maybeSingle();

  let flowId = existing?.id as string | undefined;
  if (!flowId) {
    const { data: created, error: createError } = await supabase
      .from("approval_flows")
      .insert({ department_id: departmentId, name: "สายอนุมัติหลัก" })
      .select("id")
      .single();
    if (createError) {
      console.error(createError);
      return { ok: false, error: "สร้างสายอนุมัติไม่สำเร็จ" };
    }
    flowId = created.id;
  }

  // แทนที่ขั้นตอนทั้งหมด (ใบที่กำลังวิ่งอยู่ไม่กระทบ เพราะ snapshot ไว้แล้ว)
  await supabase.from("approval_flow_steps").delete().eq("flow_id", flowId);
  const { error: insertError } = await supabase.from("approval_flow_steps").insert(
    steps.map((s, i) => ({
      flow_id: flowId,
      level: i + 1,
      step_title: s.step_title.trim(),
      approver_id: s.approver_id,
    }))
  );
  if (insertError) {
    console.error(insertError);
    return { ok: false, error: "บันทึกขั้นตอนไม่สำเร็จ" };
  }

  revalidatePath(`/hr/settings/departments/${departmentId}`);
  return { ok: true };
}

/* ---------- Site settings ---------- */

export async function saveSetting(key: string, value: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_settings").upsert({
    key,
    value,
    updated_by: user?.id,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(error);
    return { ok: false, error: "บันทึกไม่สำเร็จ (ต้องเป็นผู้ดูแลระบบเท่านั้น)" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- ปฏิทินงาน: วันทำงาน / วันหยุด / ประเภทลา ---------- */

export async function saveWorkingWeekdays(weekdays: number[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("site_settings").upsert({
    key: "working_weekdays",
    value: weekdays,
    updated_by: user?.id,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(error);
    return { ok: false, error: "บันทึกวันทำงานไม่สำเร็จ" };
  }
  revalidatePath("/hr/settings/work-calendar");
  revalidatePath("/hr/leave-summary");
  return { ok: true };
}

export async function addHoliday(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const date = (formData.get("holiday_date") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  if (!date || !name) return { ok: false, error: "กรุณากรอกวันที่และชื่อวันหยุด" };

  const { error } = await supabase.from("company_holidays").insert({ holiday_date: date, name });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "วันที่นี้เป็นวันหยุดอยู่แล้ว" };
    console.error(error);
    return { ok: false, error: "เพิ่มวันหยุดไม่สำเร็จ" };
  }
  revalidatePath("/hr/settings/work-calendar");
  revalidatePath("/hr/leave-summary");
  return { ok: true };
}

export async function deleteHoliday(date: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("company_holidays").delete().eq("holiday_date", date);
  if (error) return { ok: false, error: "ลบไม่สำเร็จ" };
  revalidatePath("/hr/settings/work-calendar");
  revalidatePath("/hr/leave-summary");
  return { ok: true };
}

export async function saveLeaveType(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = (formData.get("id") as string) || null;
  const payload = {
    name: (formData.get("name") as string)?.trim(),
    annual_quota_days: Number(formData.get("annual_quota_days") || 0),
    color: (formData.get("color") as string) || null,
  };
  if (!payload.name) return { ok: false, error: "กรุณากรอกชื่อประเภทลา" };

  const { error } = id
    ? await supabase.from("leave_types").update(payload).eq("id", id)
    : await supabase.from("leave_types").insert(payload);
  if (error) {
    console.error(error);
    return { ok: false, error: "บันทึกประเภทลาไม่สำเร็จ" };
  }
  revalidatePath("/hr/settings/work-calendar");
  revalidatePath("/hr/leave-summary");
  return { ok: true };
}

export async function deleteLeaveType(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("leave_types").delete().eq("id", id);
  if (error) return { ok: false, error: "ลบไม่สำเร็จ — อาจมีรายการลาที่ใช้ประเภทนี้อยู่" };
  revalidatePath("/hr/settings/work-calendar");
  return { ok: true };
}
