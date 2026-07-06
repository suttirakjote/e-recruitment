// ส่งอีเมลแจ้งเตือน — ถูกเรียกจาก DB trigger (pg_net)
// เลือกช่องทางส่งตาม email_settings: ถ้า enabled + ตั้งค่า SMTP → Gmail SMTP (nodemailer), ไม่งั้น fallback Resend
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const STATUS_TH: Record<string, string> = {
  submitted: "ส่งใบสมัครแล้ว",
  screening: "กำลังคัดกรอง",
  shortlisted: "ผ่านการคัดกรอง",
  interview_scheduled: "นัดสัมภาษณ์แล้ว",
  interviewed: "สัมภาษณ์เสร็จสิ้น",
  pending_approval: "รออนุมัติรับเข้าทำงาน",
  approved: "อนุมัติแล้ว",
  offer_sent: "ส่งข้อเสนอแล้ว",
  hired: "รับเข้าทำงาน",
  rejected: "ไม่ผ่านการพิจารณา",
  withdrawn: "ถอนใบสมัคร",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface EmailCfg {
  enabled: boolean; smtp_host: string; smtp_port: number;
  smtp_user: string | null; smtp_password: string | null;
  from_name: string; from_email: string | null;
}

async function sendViaSmtp(cfg: EmailCfg, to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: cfg.smtp_port,
    secure: cfg.smtp_port === 465,
    auth: { user: cfg.smtp_user!, pass: cfg.smtp_password! },
  });
  try {
    await transporter.sendMail({
      from: `"${cfg.from_name}" <${cfg.from_email || cfg.smtp_user}>`,
      to, subject, html,
    });
  } finally {
    transporter.close();
  }
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("no email provider configured (SMTP disabled and RESEND_API_KEY not set)");
  const from = Deno.env.get("EMAIL_FROM") ?? "E-Recruitment <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function sendEmail(
  cfg: EmailCfg | null, to: string, subject: string, html: string,
  template: string, refId: string
) {
  const { data: existing } = await admin
    .from("email_logs").select("id")
    .eq("template", template).eq("ref_id", refId).eq("to_email", to).eq("status", "sent").limit(1);
  if (existing && existing.length > 0) return;

  try {
    if (cfg && cfg.enabled && cfg.smtp_user && cfg.smtp_password) {
      await sendViaSmtp(cfg, to, subject, html);
    } else {
      await sendViaResend(to, subject, html);
    }
    await admin.from("email_logs").insert({ to_email: to, template, ref_id: refId, status: "sent" });
  } catch (e) {
    await admin.from("email_logs").insert({
      to_email: to, template, ref_id: refId, status: "failed", error: String(e),
    });
  }
}

async function getOrgName(): Promise<string> {
  const { data } = await admin.from("site_settings").select("value").eq("key", "org_name").single();
  return (data?.value as string) ?? "E-Recruitment";
}
function siteUrl(path: string): string {
  const base = Deno.env.get("SITE_URL") ?? "";
  return base ? `${base}${path}` : path;
}

Deno.serve(async (req: Request) => {
  try {
    const { type, application_id } = await req.json();
    if (!type || !application_id) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });

    const { data: cfg } = await admin.from("email_settings").select("*").eq("id", 1).single();
    const emailCfg = (cfg as EmailCfg | null) ?? null;

    const { data: app } = await admin
      .from("applications")
      .select("id, first_name, last_name, email, status, tracking_code, job_id, jobs(title)")
      .eq("id", application_id).single();
    if (!app) return new Response(JSON.stringify({ error: "application not found" }), { status: 404 });

    const jobTitle = (app.jobs as { title?: string } | null)?.title ?? "";
    const fullName = `${app.first_name} ${app.last_name}`;
    const orgName = await getOrgName();

    if (type === "new_application") {
      const { data: recruiters } = await admin
        .from("job_recruiters").select("profiles(email, full_name, is_active)").eq("job_id", app.job_id);
      const detailUrl = siteUrl(`/hr/applications/${app.id}`);
      for (const r of recruiters ?? []) {
        const p = r.profiles as { email?: string; is_active?: boolean } | null;
        if (!p?.email || !p.is_active) continue;
        await sendEmail(emailCfg, p.email,
          `[ใบสมัครใหม่] ${jobTitle} — ${fullName}`,
          `<p>มีผู้สมัครใหม่สำหรับตำแหน่ง <b>${jobTitle}</b></p><p>ชื่อ: ${fullName}<br/>อีเมล: ${app.email}</p><p><a href="${detailUrl}">เปิดดูใบสมัคร</a></p>`,
          "new_application_hr", app.id);
      }
      await sendEmail(emailCfg, app.email,
        `${orgName} — ได้รับใบสมัครของคุณแล้ว (${app.tracking_code})`,
        `<p>เรียนคุณ${fullName}</p><p>เราได้รับใบสมัครตำแหน่ง <b>${jobTitle}</b> ของคุณเรียบร้อยแล้ว</p><p>รหัสติดตามสถานะ: <b style="font-size:18px">${app.tracking_code}</b><br/>ใช้คู่กับอีเมลที่ <a href="${siteUrl("/track")}">หน้าติดตามสถานะ</a></p><p>ขอบคุณที่สนใจร่วมงานกับ ${orgName}</p>`,
        "application_confirmation", app.id);
    }

    if (type === "approval_state") {
      const { data: steps } = await admin
        .from("application_approvals")
        .select("id, level, step_title, decision, approver_id, profiles:approver_id(email, full_name, is_active)")
        .eq("application_id", app.id).order("level");
      if (!steps || steps.length === 0) return new Response(JSON.stringify({ ok: true }), { status: 200 });

      const rejected = steps.find((s) => s.decision === "rejected");
      const pending = steps.filter((s) => s.decision === "pending");

      if (!rejected && pending.length > 0) {
        const next = pending[0];
        const lowerBlocked = steps.some((s) => s.level < next.level && s.decision !== "approved");
        if (!lowerBlocked) {
          const p = next.profiles as { email?: string; is_active?: boolean } | null;
          if (p?.email && p.is_active) {
            await sendEmail(emailCfg, p.email,
              `[รออนุมัติ] ${fullName} — ${jobTitle}`,
              `<p>มีผู้สมัครรอการอนุมัติของคุณ (Level ${next.level}: ${next.step_title})</p><p>ผู้สมัคร: <b>${fullName}</b><br/>ตำแหน่ง: ${jobTitle}</p><p><a href="${siteUrl("/hr/approvals")}">เปิดหน้าอนุมัติ</a></p>`,
              `approval_request_l${next.level}`, app.id);
          }
        }
      } else if (rejected || pending.length === 0) {
        const outcome = rejected ? "ไม่อนุมัติ" : "อนุมัติครบทุกระดับ";
        const { data: recruiters } = await admin
          .from("job_recruiters").select("profiles(email, is_active)").eq("job_id", app.job_id);
        for (const r of recruiters ?? []) {
          const p = r.profiles as { email?: string; is_active?: boolean } | null;
          if (!p?.email || !p.is_active) continue;
          await sendEmail(emailCfg, p.email,
            `[ผลการอนุมัติ: ${outcome}] ${fullName} — ${jobTitle}`,
            `<p>สายการอนุมัติของ <b>${fullName}</b> (${jobTitle}) ได้ข้อสรุป: <b>${outcome}</b></p><p><a href="${siteUrl(`/hr/applications/${app.id}`)}">ดูรายละเอียด</a></p>`,
            `approval_result_${rejected ? "rejected" : "approved"}`, app.id);
        }
      }
    }

    if (type === "status_changed") {
      const { data: setting } = await admin
        .from("site_settings").select("value").eq("key", "notify_applicant_on_status_change").single();
      if (setting?.value === true) {
        await sendEmail(emailCfg, app.email,
          `${orgName} — อัปเดตสถานะการสมัครงานของคุณ`,
          `<p>เรียนคุณ${fullName}</p><p>สถานะการสมัครตำแหน่ง <b>${jobTitle}</b> ของคุณเปลี่ยนเป็น: <b>${STATUS_TH[app.status] ?? app.status}</b></p><p>ดูรายละเอียดที่ <a href="${siteUrl("/track")}">หน้าติดตามสถานะ</a> (ใช้อีเมล + รหัส ${app.tracking_code})</p>`,
          `status_${app.status}`, app.id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
