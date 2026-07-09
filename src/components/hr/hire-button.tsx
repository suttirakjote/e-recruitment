"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { createEmployeeFromApplication } from "@/app/hr/(portal)/employees/actions";

export function HireButton({
  applicationId,
  existingEmployeeId,
}: {
  applicationId: string;
  existingEmployeeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (existingEmployeeId) {
    return (
      <Link
        href={`/hr/employees/${existingEmployeeId}`}
        className="inline-flex rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
      >
        ✓ รับเข้าเป็นพนักงานแล้ว — ดูข้อมูลพนักงาน →
      </Link>
    );
  }

  return (
    <div>
      <Button
        className="bg-emerald-700"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createEmployeeFromApplication(applicationId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/hr/employees/${result.data!.employeeId}/edit`);
          })
        }
      >
        {pending ? "กำลังสร้าง..." : "รับเข้าทำงาน → สร้างเป็นพนักงาน"}
      </Button>
      <p className="mt-1 text-xs text-stone-500">
        สร้างข้อมูลพนักงานจากใบสมัครนี้ (ดึงข้อมูลส่วนตัวมาให้อัตโนมัติ) แล้วเปลี่ยนสถานะเป็น &quot;รับเข้าทำงาน&quot;
      </p>
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
