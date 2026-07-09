"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { WEEKDAY_LABELS } from "@/lib/workdays";
import {
  addHoliday,
  deleteHoliday,
  deleteLeaveType,
  saveLeaveType,
  saveWorkingWeekdays,
} from "@/app/hr/(portal)/settings/actions";

interface Holiday {
  holiday_date: string;
  name: string;
}
interface LeaveType {
  id: string;
  name: string;
  annual_quota_days: number;
  color: string | null;
}

export function WorkCalendarManager({
  initialWeekdays,
  holidays,
  leaveTypes,
  years,
}: {
  initialWeekdays: number[];
  holidays: Holiday[];
  leaveTypes: LeaveType[];
  years: number[];
}) {
  const router = useRouter();
  const [weekdays, setWeekdays] = useState<number[]>(initialWeekdays);
  const [year, setYear] = useState<number>(years[0]);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggleDay(d: number) {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  }

  const yearHolidays = holidays
    .filter((h) => new Date(h.holiday_date).getFullYear() === year)
    .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));

  return (
    <div className="space-y-6">
      {/* วันทำงานในสัปดาห์ */}
      <Card>
        <h2 className="mb-3 font-semibold text-stone-800">วันทำงานในสัปดาห์</h2>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`h-10 w-12 rounded-lg border text-sm font-medium ${
                weekdays.includes(d)
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-stone-300 bg-white text-stone-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          className="mt-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await saveWorkingWeekdays(weekdays);
              setMsg(r.ok ? "บันทึกวันทำงานแล้ว" : null);
              setErr(r.ok ? null : r.error);
              router.refresh();
            })
          }
        >
          บันทึกวันทำงาน
        </Button>
        {msg && <span className="ml-3 text-sm text-emerald-700">{msg}</span>}
      </Card>

      {/* วันหยุดบริษัท */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-stone-800">วันหยุดบริษัท</h2>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>ปี {y + 543}</option>
            ))}
          </select>
        </div>

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            startTransition(async () => {
              const r = await addHoliday(new FormData(form));
              if (!r.ok) { setErr(r.error); return; }
              setErr(null);
              form.reset();
              router.refresh();
            });
          }}
        >
          <Input type="date" name="holiday_date" required className="w-44" />
          <Input name="name" placeholder="ชื่อวันหยุด เช่น วันสงกรานต์" required className="w-64" />
          <Button type="submit" disabled={pending}>+ เพิ่มวันหยุด</Button>
        </form>

        <ul className="mt-4 divide-y divide-stone-100">
          {yearHolidays.map((h) => (
            <li key={h.holiday_date} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-mono text-stone-500">
                  {new Date(h.holiday_date).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                </span>
                <span className="ml-3 text-stone-800">{h.name}</span>
              </span>
              <button
                className="rounded px-2 py-0.5 text-xs text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() =>
                  startTransition(async () => {
                    await deleteHoliday(h.holiday_date);
                    router.refresh();
                  })
                }
              >
                ลบ
              </button>
            </li>
          ))}
          {yearHolidays.length === 0 && (
            <li className="py-4 text-center text-sm text-stone-400">ยังไม่มีวันหยุดในปีนี้</li>
          )}
        </ul>
        <p className="mt-2 text-xs text-stone-400">
          รวมวันหยุดปี {year + 543}: {yearHolidays.length} วัน (ระบบจะหักออกจากวันทำงานอัตโนมัติ)
        </p>
      </Card>

      {/* ประเภทวันลา */}
      <Card>
        <h2 className="mb-3 font-semibold text-stone-800">ประเภทวันลา & โควตาต่อปี</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            startTransition(async () => {
              const r = await saveLeaveType(new FormData(form));
              if (!r.ok) { setErr(r.error); return; }
              setErr(null);
              form.reset();
              router.refresh();
            });
          }}
        >
          <Input name="name" placeholder="ชื่อ เช่น ลาพักร้อน" required className="w-56" />
          <Input name="annual_quota_days" type="number" step="0.5" min="0" placeholder="โควตา/ปี" required className="w-32" />
          <Button type="submit" disabled={pending}>+ เพิ่มประเภทลา</Button>
        </form>

        <ul className="mt-4 divide-y divide-stone-100">
          {leaveTypes.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-stone-800">{t.name}</span>
              <span className="flex items-center gap-4">
                <span className="text-stone-500">{t.annual_quota_days} วัน/ปี</span>
                <button
                  className="rounded px-2 py-0.5 text-xs text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() =>
                    startTransition(async () => {
                      if (!confirm(`ลบประเภทลา "${t.name}"?`)) return;
                      const r = await deleteLeaveType(t.id);
                      if (!r.ok) setErr(r.error);
                      router.refresh();
                    })
                  }
                >
                  ลบ
                </button>
              </span>
            </li>
          ))}
          {leaveTypes.length === 0 && (
            <li className="py-4 text-center text-sm text-stone-400">ยังไม่มีประเภทวันลา</li>
          )}
        </ul>
      </Card>

      {err && <p className="text-sm text-rose-600">{err}</p>}
    </div>
  );
}
