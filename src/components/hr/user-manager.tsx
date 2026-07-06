"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { HR_ROLE_LABELS } from "@/lib/status";
import { AvatarUpload } from "@/components/hr/avatar-upload";
import type { Department, Profile } from "@/lib/types";

async function callAdminUsers(body: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    // supabase-js ห่อ error ของ function ไว้ — ดึงข้อความจริงถ้ามี
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const parsed = await ctx.json();
        return { error: parsed.error as string };
      }
    } catch { /* ใช้ข้อความ generic */ }
    return { error: "เรียกใช้งานไม่สำเร็จ" };
  }
  return data as { ok?: boolean; error?: string };
}

export function UserManager({
  profiles,
  departments,
}: {
  profiles: Profile[];
  departments: Department[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(body: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await callAdminUsers(body);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setMessage(successMessage);
    router.refresh();
    return true;
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const ok = await run(
      {
        action: "create",
        email: fd.get("email"),
        password: fd.get("password"),
        full_name: fd.get("full_name"),
        role: fd.get("role"),
        job_title: fd.get("job_title") || null,
        department_id: fd.get("department_id") || null,
      },
      "สร้างบัญชีแล้ว — แจ้งอีเมลและรหัสผ่านให้ผู้ใช้โดยตรง"
    );
    if (ok) form.reset();
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-semibold text-stone-800">สร้างบัญชีผู้ใช้ใหม่</h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-3">
          <Field label="ชื่อ-นามสกุล" required>
            <Input name="full_name" required />
          </Field>
          <Field label="อีเมล" required>
            <Input name="email" type="email" required />
          </Field>
          <Field label="รหัสผ่านเริ่มต้น" required hint="อย่างน้อย 8 ตัวอักษร">
            <Input name="password" type="text" minLength={8} required />
          </Field>
          <Field label="บทบาท" required>
            <Select name="role" required defaultValue="hr_staff">
              <option value="hr_admin">ผู้ดูแลระบบ</option>
              <option value="hr_staff">เจ้าหน้าที่ HR</option>
              <option value="approver">ผู้อนุมัติ</option>
              <option value="viewer">ผู้ดูข้อมูล</option>
            </Select>
          </Field>
          <Field label="ตำแหน่งงาน" hint='เช่น "IT Manager", "COO"'>
            <Input name="job_title" />
          </Field>
          <Field label="แผนก">
            <Select name="department_id" defaultValue="">
              <option value="">— ไม่ระบุ —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name_th}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy}>
              {busy ? "กำลังสร้าง..." : "+ สร้างบัญชี"}
            </Button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-6 py-3 font-medium">รูป / ชื่อ</th>
              <th className="px-4 py-3 font-medium">อีเมล</th>
              <th className="px-4 py-3 font-medium">บทบาท</th>
              <th className="px-4 py-3 font-medium">ตำแหน่ง</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-0">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <AvatarUpload
                      userId={p.id}
                      name={p.full_name}
                      photoPath={p.photo_path}
                      mode="admin"
                      size={40}
                    />
                    <span className="font-medium text-stone-800">{p.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-600">{p.email}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-stone-200 px-2 py-1 text-xs"
                    defaultValue={p.role}
                    disabled={busy}
                    onChange={(e) =>
                      run({ action: "update", user_id: p.id, role: e.target.value },
                        "เปลี่ยนบทบาทแล้ว")
                    }
                  >
                    {Object.entries(HR_ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-stone-600">{p.job_title ?? "-"}</td>
                <td className="px-4 py-3">
                  {p.is_active ? (
                    <span className="text-emerald-700">ใช้งานอยู่</span>
                  ) : (
                    <span className="text-stone-400">ปิดใช้งาน</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-200"
                      disabled={busy}
                      onClick={() => {
                        const password = prompt(`ตั้งรหัสผ่านใหม่ให้ ${p.full_name} (อย่างน้อย 8 ตัว):`);
                        if (password && password.length >= 8) {
                          run({ action: "reset_password", user_id: p.id, password },
                            "ตั้งรหัสผ่านใหม่แล้ว — แจ้งผู้ใช้โดยตรง");
                        }
                      }}
                    >
                      รีเซ็ตรหัสผ่าน
                    </button>
                    <button
                      className={`rounded-lg px-2.5 py-1 text-xs ${p.is_active ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                      disabled={busy}
                      onClick={() =>
                        run({ action: "update", user_id: p.id, is_active: !p.is_active },
                          p.is_active ? "ปิดใช้งานบัญชีแล้ว" : "เปิดใช้งานบัญชีแล้ว")
                      }
                    >
                      {p.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
