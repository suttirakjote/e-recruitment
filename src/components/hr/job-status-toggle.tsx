"use client";

import { useTransition } from "react";
import { setJobStatus } from "@/app/hr/(portal)/actions";

export function JobStatusToggle({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const isOpen = status === "open";

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setJobStatus(jobId, isOpen ? "closed" : "open");
        })
      }
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        isOpen
          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {pending ? "..." : isOpen ? "ปิดรับสมัคร" : "เปิดรับสมัคร"}
    </button>
  );
}
