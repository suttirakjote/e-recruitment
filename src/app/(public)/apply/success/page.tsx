import Link from "next/link";
import { Card } from "@/components/ui";

export default async function ApplySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Card>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">
          ส่งใบสมัครเรียบร้อยแล้ว
        </h1>
        <p className="mt-2 text-stone-600">
          ขอบคุณที่สนใจร่วมงานกับเรา ทีมงานจะติดต่อกลับโดยเร็วที่สุด
        </p>
        {code && (
          <div className="mt-6 rounded-lg bg-stone-50 p-4">
            <p className="text-sm text-stone-500">รหัสติดตามสถานะของคุณ</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-emerald-700">
              {code}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              กรุณาบันทึกรหัสนี้ไว้ ใช้คู่กับอีเมลของคุณเพื่อติดตามสถานะ
              (ระบบได้ส่งรหัสนี้ไปที่อีเมลของคุณด้วยแล้ว)
            </p>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-4 text-sm font-medium">
          <Link href="/track" className="text-emerald-700 hover:underline">
            ติดตามสถานะ
          </Link>
          <Link href="/jobs" className="text-stone-500 hover:underline">
            กลับหน้าตำแหน่งงาน
          </Link>
        </div>
      </Card>
    </div>
  );
}
