import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, SectionTitle } from "@/components/ui";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatDateTime,
} from "@/lib/status";
import type {
  Application,
  ApplicationFile,
  ApprovalStep,
  StatusHistory,
} from "@/lib/types";
import { FormDataView } from "@/components/hr/form-data-view";
import { Avatar } from "@/components/hr/avatar";
import { CvPreview } from "@/components/hr/cv-preview";
import {
  NoteForm,
  StartApprovalButton,
  StatusControl,
} from "@/components/hr/application-controls";
import { getProfile, canWrite } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const [
    { data: app },
    { data: files },
    { data: history },
    { data: notes },
    { data: approvals },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("*, jobs(id, title, departments(name_th))")
      .eq("id", id)
      .single<Application & { jobs: { id: string; title: string; departments: { name_th: string } | null } }>(),
    supabase.from("application_files").select("*").eq("application_id", id)
      .overrideTypes<ApplicationFile[]>(),
    supabase
      .from("application_status_history")
      .select("*, profiles(full_name)")
      .eq("application_id", id)
      .order("created_at", { ascending: false })
      .overrideTypes<StatusHistory[]>(),
    supabase
      .from("application_notes")
      .select("id, body, created_at, profiles(full_name)")
      .eq("application_id", id)
      .order("created_at", { ascending: false })
      .overrideTypes<NoteRow[]>(),
    supabase
      .from("application_approvals")
      .select("*, profiles:approver_id(full_name, email, photo_path)")
      .eq("application_id", id)
      .order("level")
      .overrideTypes<ApprovalStep[]>(),
  ]);

  if (!app) notFound();

  // signed URL สำหรับไฟล์แนบ (หมดอายุ 1 ชม.)
  const signedFiles = await Promise.all(
    (files ?? []).map(async (f) => {
      const { data } = await supabase.storage
        .from("applications")
        .createSignedUrl(f.storage_path, 3600);
      return { ...f, url: data?.signedUrl ?? null };
    })
  );
  const cv = signedFiles.find((f) => f.file_type === "cv");
  const photo = signedFiles.find((f) => f.file_type === "photo");

  const writer = profile ? canWrite(profile) : false;
  const hasApprovals = (approvals?.length ?? 0) > 0;

  return (
    <div>
      <Link href="/hr/applications" className="text-sm text-stone-500 hover:text-emerald-700">
        ← ใบสมัครทั้งหมด
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {photo?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="รูปผู้สมัคร"
              className="h-16 w-16 rounded-lg border border-stone-200 object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              {app.first_name} {app.last_name}
            </h1>
            <p className="text-sm text-stone-500">
              สมัคร: {app.jobs?.title} ({app.jobs?.departments?.name_th}) ·{" "}
              {formatDateTime(app.submitted_at)}
            </p>
            <p className="text-sm text-stone-500">
              {app.email} · {app.phone} · รหัส {app.tracking_code}
            </p>
          </div>
        </div>
        <Badge className={`${STATUS_COLORS[app.status]} px-3 py-1 text-sm`}>
          {STATUS_LABELS[app.status]}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ซ้าย: ข้อมูลใบสมัคร + CV */}
        <div className="space-y-6 lg:col-span-2">
          {cv?.url && (
            <Card>
              <SectionTitle>CV / Resume</SectionTitle>
              <CvPreview url={cv.url} fileName={cv.file_name} />
            </Card>
          )}

          <Card>
            <SectionTitle>แบบฟอร์มใบสมัคร</SectionTitle>
            <FormDataView data={app.form_data} />
          </Card>
        </div>

        {/* ขวา: การจัดการ + timeline */}
        <div className="space-y-6">
          {writer && (
            <Card>
              <SectionTitle>จัดการใบสมัคร</SectionTitle>
              <StatusControl applicationId={app.id} currentStatus={app.status} />
              {!hasApprovals && app.status !== "rejected" && app.status !== "withdrawn" && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <p className="mb-2 text-xs text-stone-500">
                    เมื่อผู้สมัครผ่านการสัมภาษณ์แล้ว
                    ส่งเข้าสายอนุมัติตามแผนกเพื่อขออนุมัติรับเข้าทำงาน
                  </p>
                  <StartApprovalButton applicationId={app.id} />
                </div>
              )}
            </Card>
          )}

          {hasApprovals && (
            <Card>
              <SectionTitle>สายการอนุมัติ</SectionTitle>
              <ol className="space-y-0">
                {approvals!.map((step, i) => {
                  const isLast = i === approvals!.length - 1;
                  const icon =
                    step.decision === "approved" ? "✓" : step.decision === "rejected" ? "✕" : String(step.level);
                  const color =
                    step.decision === "approved"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : step.decision === "rejected"
                        ? "border-rose-600 bg-rose-600 text-white"
                        : "border-stone-300 bg-white text-stone-400";
                  return (
                    <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                      {!isLast && (
                        <span className="absolute left-[11px] top-6 h-full w-0.5 bg-stone-200" />
                      )}
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${color}`}>
                        {icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-stone-800">
                          Level {step.level}: {step.step_title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Avatar
                            photoPath={step.profiles?.photo_path}
                            name={step.profiles?.full_name ?? "?"}
                            size={24}
                          />
                          <p className="text-xs text-stone-500">{step.profiles?.full_name}</p>
                        </div>
                        {step.decided_at ? (
                          <p className="text-xs text-stone-400">
                            {step.decision === "approved" ? "อนุมัติเมื่อ" : "ไม่อนุมัติเมื่อ"}{" "}
                            {formatDateTime(step.decided_at)}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600">รอดำเนินการ</p>
                        )}
                        {step.comment && (
                          <p className="mt-1 rounded bg-stone-50 px-2 py-1 text-xs text-stone-600">
                            &quot;{step.comment}&quot;
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          <Card>
            <SectionTitle>ประวัติสถานะ</SectionTitle>
            <ol className="space-y-3">
              {history?.map((h) => (
                <li key={h.id} className="text-sm">
                  <p className="font-medium text-stone-800">
                    {STATUS_LABELS[h.to_status]}
                  </p>
                  <p className="text-xs text-stone-400">
                    {formatDateTime(h.created_at)}
                    {h.profiles?.full_name ? ` · โดย ${h.profiles.full_name}` : ""}
                  </p>
                  {h.public_note && (
                    <p className="text-xs text-emerald-700">ถึงผู้สมัคร: {h.public_note}</p>
                  )}
                  {h.note && <p className="text-xs text-stone-500">โน้ต: {h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <SectionTitle>โน้ตภายใน</SectionTitle>
            {profile && <NoteForm applicationId={app.id} />}
            <ul className="mt-4 space-y-3">
              {notes?.map((n) => (
                <li key={n.id} className="rounded-lg bg-stone-50 p-3 text-sm">
                  <p className="whitespace-pre-line text-stone-700">{n.body}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {n.profiles?.full_name} · {formatDateTime(n.created_at)}
                  </p>
                </li>
              ))}
              {(!notes || notes.length === 0) && (
                <li className="text-sm text-stone-400">ยังไม่มีโน้ต</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
