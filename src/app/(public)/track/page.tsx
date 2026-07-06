"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  formatDateTime,
  type ApplicationStatus,
} from "@/lib/status";

interface TrackResult {
  tracking_code: string;
  job_title: string;
  first_name: string;
  status: ApplicationStatus;
  submitted_at: string;
  history: {
    to_status: ApplicationStatus;
    public_note: string | null;
    created_at: string;
  }[];
}

export default function TrackPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("track_application", {
      p_email: email,
      p_code: code,
    });
    setLoading(false);
    if (rpcError) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      return;
    }
    if (!data) {
      setError("ไม่พบใบสมัคร กรุณาตรวจสอบอีเมลและรหัสติดตามให้ถูกต้อง");
      return;
    }
    setResult(data as TrackResult);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">ติดตามสถานะการสมัครงาน</h1>
      <p className="mt-1 text-sm text-stone-500">
        กรอกอีเมลที่ใช้สมัคร พร้อมรหัสติดตาม (เช่น APP-2026-XXXXXX)
        ที่ได้รับทางอีเมลหลังส่งใบสมัคร
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-2">
          <Field label="อีเมลที่ใช้สมัคร" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </Field>
          <Field label="รหัสติดตาม" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="APP-2026-XXXXXX"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังค้นหา..." : "ตรวจสอบสถานะ"}
            </Button>
          </div>
        </form>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      </Card>

      {result && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-stone-500">
                คุณ{result.first_name} · ตำแหน่ง {result.job_title}
              </p>
              <p className="text-xs text-stone-400">
                รหัส {result.tracking_code} · สมัครเมื่อ{" "}
                {formatDateTime(result.submitted_at)}
              </p>
            </div>
            <Badge className={STATUS_COLORS[result.status]}>
              {STATUS_LABELS[result.status]}
            </Badge>
          </div>

          <ol className="mt-6 space-y-0">
            {result.history.map((h, i) => {
              const isLast = i === result.history.length - 1;
              return (
                <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && (
                    <span className="absolute left-[7px] top-5 h-full w-0.5 bg-stone-200" />
                  )}
                  <span
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${isLast ? "border-emerald-600 bg-emerald-600" : "border-stone-300 bg-white"}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {STATUS_LABELS[h.to_status]}
                    </p>
                    {h.public_note && (
                      <p className="text-sm text-stone-600">{h.public_note}</p>
                    )}
                    <p className="text-xs text-stone-400">
                      {formatDateTime(h.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </div>
  );
}
