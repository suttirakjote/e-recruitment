"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { decideApproval } from "@/app/hr/(portal)/actions";

export function ApprovalDecision({ stepId }: { stepId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && !comment.trim()) {
      setError("กรุณาระบุเหตุผลเมื่อไม่อนุมัติ");
      return;
    }
    startTransition(async () => {
      const result = await decideApproval(stepId, decision, comment);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        rows={2}
        placeholder="ความเห็นประกอบการพิจารณา (จำเป็นเมื่อไม่อนุมัติ)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => decide("approved")}>
          ✓ อนุมัติ
        </Button>
        <Button variant="danger" disabled={pending} onClick={() => decide("rejected")}>
          ✕ ไม่อนุมัติ
        </Button>
      </div>
    </div>
  );
}
