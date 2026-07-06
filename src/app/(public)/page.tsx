import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgName } from "@/lib/settings";

export default async function HomePage() {
  const [orgName, supabase] = await Promise.all([getOrgName(), createClient()]);
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="flex flex-col items-center py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight text-stone-900">
          ร่วมเป็นส่วนหนึ่งของทีม{" "}
          <span className="text-emerald-700">{orgName}</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-stone-600">
          เรากำลังมองหาเพื่อนร่วมงานที่มีความสามารถ มาเติบโตไปด้วยกัน
          ขณะนี้เปิดรับสมัคร {count ?? 0} ตำแหน่ง
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/jobs"
            className="rounded-lg bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-800"
          >
            ดูตำแหน่งงานทั้งหมด
          </Link>
          <Link
            href="/track"
            className="rounded-lg border border-stone-300 bg-white px-6 py-3 font-medium text-stone-700 hover:bg-stone-50"
          >
            ติดตามสถานะการสมัคร
          </Link>
        </div>
      </section>
    </div>
  );
}
