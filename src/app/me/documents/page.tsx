import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { Card, SectionTitle } from "@/components/ui";
import { formatDate } from "@/lib/status";

export const dynamic = "force-dynamic";

const DOC_TYPES: Record<string, string> = {
  contract: "สัญญาจ้าง",
  id_card: "บัตรประชาชน/ทะเบียนบ้าน",
  certificate: "วุฒิการศึกษา/ใบรับรอง",
  evaluation: "ผลประเมิน",
  other: "อื่นๆ",
};

export default async function MyDocumentsPage() {
  const profile = await getProfile();
  if (!profile?.employee_id) {
    return (
      <Card>
        <p className="text-stone-700">บัญชีของคุณยังไม่ได้เชื่อมกับข้อมูลพนักงาน</p>
      </Card>
    );
  }

  const supabase = await createClient();
  // RLS คืนเฉพาะเอกสารของตัวเองที่ visible_to_employee = true
  const { data: docs } = await supabase
    .from("employee_documents")
    .select("id, doc_type, title, storage_path, file_name, uploaded_at")
    .eq("employee_id", profile.employee_id)
    .order("uploaded_at", { ascending: false });

  const documents = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await supabase.storage
        .from("employee-docs")
        .createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">เอกสารของฉัน</h1>
      <Card>
        <SectionTitle>เอกสารที่ฝ่ายบุคคลแชร์ให้</SectionTitle>
        <ul className="divide-y divide-stone-100">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-emerald-700 hover:underline">
                    {d.title}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-stone-700">{d.title}</span>
                )}
                <p className="text-xs text-stone-400">
                  {DOC_TYPES[d.doc_type] ?? d.doc_type} · {formatDate(d.uploaded_at)}
                </p>
              </div>
              {d.url && (
                <a href={d.url} download={d.file_name}
                  className="shrink-0 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200">
                  ดาวน์โหลด
                </a>
              )}
            </li>
          ))}
          {documents.length === 0 && (
            <li className="py-8 text-center text-sm text-stone-400">
              ยังไม่มีเอกสารที่แชร์ให้คุณ
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
