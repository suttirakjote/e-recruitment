"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown, fallback: string): ActionResult {
  console.error(error);
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: string }).message)
      : fallback;
  return { ok: false, error: message };
}

/* ---------- ตำแหน่งงาน ---------- */

export async function saveJob(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = (formData.get("id") as string) || null;

  const payload = {
    title: (formData.get("title") as string)?.trim(),
    department_id: formData.get("department_id") as string,
    description: (formData.get("description") as string) || null,
    requirements: (formData.get("requirements") as string) || null,
    employment_type: (formData.get("employment_type") as string) || "full_time",
    location: (formData.get("location") as string) || null,
    salary_range: (formData.get("salary_range") as string) || null,
    openings: Number(formData.get("openings") || 1),
    status: (formData.get("status") as string) || "draft",
    ...(formData.get("status") === "open" ? { published_at: new Date().toISOString() } : {}),
  };

  if (!payload.title || !payload.department_id) {
    return { ok: false, error: "กรุณากรอกชื่อตำแหน่งและเลือกแผนก" };
  }

  let jobId = id;
  if (id) {
    const { error } = await supabase.from("jobs").update(payload).eq("id", id);
    if (error) return fail(error, "บันทึกตำแหน่งไม่สำเร็จ");
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...payload, created_by: user?.id })
      .select("id")
      .single();
    if (error) return fail(error, "สร้างตำแหน่งไม่สำเร็จ");
    jobId = data.id;
  }

  // ผู้รับผิดชอบ (รับอีเมลแจ้งเตือน)
  const recruiterIds = formData.getAll("recruiters") as string[];
  await supabase.from("job_recruiters").delete().eq("job_id", jobId);
  if (recruiterIds.length > 0) {
    await supabase
      .from("job_recruiters")
      .insert(recruiterIds.map((profileId) => ({ job_id: jobId, profile_id: profileId })));
  }

  revalidatePath("/hr/recruitment/jobs");
  return { ok: true };
}

export async function setJobStatus(jobId: string, status: string): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "open") {
    patch.published_at = new Date().toISOString();
    patch.closed_at = null; // ล้างค่าเก่ากรณีเคยปิดไปแล้วเปิดใหม่
  }
  if (status === "closed") patch.closed_at = new Date().toISOString();
  const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
  if (error) return fail(error, "เปลี่ยนสถานะตำแหน่งไม่สำเร็จ");
  revalidatePath("/hr/recruitment/jobs");
  revalidatePath("/jobs");
  return { ok: true };
}

/* ---------- ใบสมัคร ---------- */

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  publicNote?: string,
  internalNote?: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId);
  if (error) return fail(error, "เปลี่ยนสถานะไม่สำเร็จ");

  // trigger เขียน history row ให้แล้ว — เติมโน้ตลงแถวล่าสุด
  if (publicNote || internalNote) {
    const { data: latest } = await supabase
      .from("application_status_history")
      .select("id")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (latest) {
      await supabase
        .from("application_status_history")
        .update({ public_note: publicNote || null, note: internalNote || null })
        .eq("id", latest.id);
    }
  }

  revalidatePath(`/hr/recruitment/applications/${applicationId}`);
  revalidatePath("/hr/recruitment/applications");
  return { ok: true };
}

export async function addNote(applicationId: string, body: string): Promise<ActionResult> {
  if (!body.trim()) return { ok: false, error: "กรุณากรอกข้อความ" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("application_notes").insert({
    application_id: applicationId,
    author_id: user?.id,
    body: body.trim(),
  });
  if (error) return fail(error, "บันทึกโน้ตไม่สำเร็จ");
  revalidatePath(`/hr/recruitment/applications/${applicationId}`);
  return { ok: true };
}

/* ---------- Approval ---------- */

export async function startApproval(applicationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_approval_process", {
    app_id: applicationId,
  });
  if (error) {
    if (error.message.includes("no active approval flow")) {
      return {
        ok: false,
        error:
          "แผนกนี้ยังไม่ได้ตั้งค่าสายอนุมัติ กรุณาตั้งค่าที่เมนู แผนก & สายอนุมัติ ก่อน",
      };
    }
    if (error.message.includes("already started")) {
      return { ok: false, error: "ใบสมัครนี้เข้าสายอนุมัติแล้ว" };
    }
    return fail(error, "ส่งเข้าสายอนุมัติไม่สำเร็จ");
  }
  revalidatePath(`/hr/recruitment/applications/${applicationId}`);
  return { ok: true };
}

export async function decideApproval(
  stepId: string,
  decision: "approved" | "rejected",
  comment: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("application_approvals")
    .update({ decision, comment: comment.trim() || null })
    .eq("id", stepId);
  if (error) {
    if (error.message.includes("previous approval levels")) {
      return { ok: false, error: "ยังไม่ถึงลำดับของคุณ — ระดับก่อนหน้ายังไม่อนุมัติ" };
    }
    return fail(error, "บันทึกผลการอนุมัติไม่สำเร็จ");
  }
  revalidatePath("/hr/recruitment/approvals");
  return { ok: true };
}
