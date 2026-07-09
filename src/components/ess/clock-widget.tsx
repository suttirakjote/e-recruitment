"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { formatTime } from "@/lib/status";
import { LocationView } from "@/components/ess/location-view";

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

export function ClockWidget({
  clockInAt,
  clockOutAt,
  workMode,
  clockInLat,
  clockInLng,
  clockOutLat,
  clockOutLng,
}: {
  clockInAt: string | null;
  clockOutAt: string | null;
  workMode: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState(false);
  const [locating, setLocating] = useState(false);

  function run(action: "clock_in" | "clock_out") {
    setError(null);
    setLocating(true);
    startTransition(async () => {
      const pos = await getPosition();
      setLocating(false);
      const supabase = createClient();
      const args =
        action === "clock_in"
          ? { p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null, p_mode: remote ? "remote" : "office" }
          : { p_lat: pos?.lat ?? null, p_lng: pos?.lng ?? null };
      const { error: rpcError } = await supabase.rpc(action, args);
      if (rpcError) {
        setError(
          rpcError.message.includes("not_clocked_in")
            ? "ยังไม่ได้ลงเวลาเข้างานวันนี้"
            : "ทำรายการไม่สำเร็จ กรุณาลองใหม่"
        );
        return;
      }
      router.refresh();
    });
  }

  const busy = pending || locating;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">วันนี้</p>
        {clockInAt && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${workMode === "remote" ? "bg-violet-100 text-violet-800" : "bg-stone-100 text-stone-600"}`}>
            {workMode === "remote" ? "ทำงานนอกสถานที่" : "ในสถานที่"}
          </span>
        )}
      </div>

      <div className="mt-3 flex justify-center gap-8 text-center">
        <div>
          <p className="text-xs text-stone-400">เวลาเข้า</p>
          <p className="text-2xl font-bold text-emerald-700">{formatTime(clockInAt)}</p>
          {clockInAt && <LocationView lat={clockInLat} lng={clockInLng} label="ตำแหน่งเข้า" />}
        </div>
        <div>
          <p className="text-xs text-stone-400">เวลาออก</p>
          <p className="text-2xl font-bold text-stone-700">{formatTime(clockOutAt)}</p>
          {clockOutAt && <LocationView lat={clockOutLat} lng={clockOutLng} label="ตำแหน่งออก" />}
        </div>
      </div>

      {!clockInAt && (
        <label className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
          ทำงานนอกสถานที่ (Remote / นอกออฟฟิศ)
        </label>
      )}

      <div className="mt-4 flex justify-center gap-3">
        <Button disabled={busy || !!clockInAt} onClick={() => run("clock_in")}>
          {clockInAt ? "ลงเวลาเข้าแล้ว" : locating ? "กำลังระบุตำแหน่ง..." : pending ? "..." : "ลงเวลาเข้างาน"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !clockInAt || !!clockOutAt}
          onClick={() => run("clock_out")}
        >
          {clockOutAt ? "ลงเวลาออกแล้ว" : locating ? "กำลังระบุตำแหน่ง..." : "ลงเวลาออกงาน"}
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-stone-400">
        ระบบจะขอสิทธิ์เข้าถึงตำแหน่ง (GPS) เพื่อบันทึกพิกัดตอนลงเวลา —
        หากไม่อนุญาต ยังลงเวลาได้แต่จะไม่มีพิกัด
      </p>
      {error && <p className="mt-2 text-center text-sm text-rose-600">{error}</p>}
    </div>
  );
}
