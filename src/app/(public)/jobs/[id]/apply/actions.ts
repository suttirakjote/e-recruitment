"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_CV_SIZE = 5 * 1024 * 1024;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

/** field ที่ต้องตัดออกถ้าผู้สมัครไม่ให้ความยินยอมข้อมูลอ่อนไหว */
function stripSensitive(formData: Record<string, unknown>) {
  const personal = formData.personal as Record<string, unknown> | undefined;
  if (personal) {
    delete personal.religion;
    delete personal.blood_type;
  }
  const further = formData.further as Record<string, unknown> | undefined;
  if (further) {
    delete further.serious_illness;
    delete further.criminal_record;
    delete further.pregnant;
  }
}

export async function submitApplication(payload: FormData): Promise<
  | { ok: true; trackingCode: string }
  | { ok: false; error: string }
> {
  try {
    const jobId = payload.get("job_id") as string;
    const raw = payload.get("data") as string;
    const cv = payload.get("cv") as File | null;
    const photo = payload.get("photo") as File | null;

    if (!jobId || !raw) return { ok: false, error: "ข้อมูลไม่ครบถ้วน" };
    const data = JSON.parse(raw);

    const { firstName, lastName, email, phone, formData, pdpaConsent } = data as {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      formData: Record<string, unknown>;
      pdpaConsent: boolean;
    };

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim()) {
      return { ok: false, error: "กรุณากรอกชื่อ นามสกุล อีเมล และเบอร์โทรให้ครบถ้วน" };
    }
    if (!pdpaConsent) {
      return { ok: false, error: "กรุณารับทราบประกาศคุ้มครองข้อมูลส่วนบุคคลก่อนส่งใบสมัคร" };
    }
    if (!cv || cv.size === 0) {
      return { ok: false, error: "กรุณาแนบไฟล์ CV/Resume" };
    }
    if (cv.size > MAX_CV_SIZE) {
      return { ok: false, error: "ไฟล์ CV ต้องมีขนาดไม่เกิน 5MB" };
    }
    if (photo && photo.size > MAX_PHOTO_SIZE) {
      return { ok: false, error: "ไฟล์รูปถ่ายต้องมีขนาดไม่เกิน 2MB" };
    }

    const consents = (formData.consents ?? {}) as Record<string, unknown>;
    if (!consents.pdpa_sensitive) stripSensitive(formData);

    const supabase = await createClient();

    // ส่งผ่าน RPC (SECURITY DEFINER) — ผู้สมัคร anon อ่านแถวใน applications กลับไม่ได้ตาม RLS
    const { data: app, error: insertError } = await supabase
      .rpc("submit_application", {
        p_job_id: jobId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: email,
        p_phone: phone,
        p_form_data: formData,
      })
      .single<{ id: string; tracking_code: string }>();

    if (insertError) {
      const msg = insertError.message ?? "";
      if (msg.includes("duplicate")) {
        return {
          ok: false,
          error:
            "อีเมลนี้เคยสมัครตำแหน่งนี้แล้ว หากต้องการติดตามสถานะ กรุณาใช้เมนูติดตามสถานะ",
        };
      }
      if (msg.includes("job_not_open")) {
        return { ok: false, error: "ตำแหน่งนี้ปิดรับสมัครแล้ว" };
      }
      console.error("submitApplication rpc error:", insertError);
      return { ok: false, error: "เกิดข้อผิดพลาดในการส่งใบสมัคร กรุณาลองใหม่" };
    }
    if (!app) {
      return { ok: false, error: "เกิดข้อผิดพลาดในการส่งใบสมัคร กรุณาลองใหม่" };
    }

    // อัปโหลดไฟล์แนบ — พลาดแล้วไม่ล้มทั้งใบสมัคร (HR ตามขอเพิ่มได้)
    const files: { file: File; type: string }[] = [{ file: cv, type: "cv" }];
    if (photo && photo.size > 0) files.push({ file: photo, type: "photo" });

    for (const { file, type } of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${app.id}/${type}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("applications")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) {
        console.error("upload error:", uploadError);
        continue;
      }
      await supabase.from("application_files").insert({
        application_id: app.id,
        file_type: type,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
      });
    }

    return { ok: true, trackingCode: app.tracking_code };
  } catch (err) {
    console.error("submitApplication error:", err);
    return { ok: false, error: "เกิดข้อผิดพลาดในการส่งใบสมัคร กรุณาลองใหม่" };
  }
}
