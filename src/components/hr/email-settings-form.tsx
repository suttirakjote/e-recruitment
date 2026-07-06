"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, Input, Select } from "@/components/ui";

interface Cfg {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  from_name: string;
  from_email: string;
  enabled: boolean;
  has_password: boolean;
}

async function callEmailConfig(body: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("email-config", { body });
  if (error) {
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const parsed = await ctx.json();
        return { error: parsed.error as string };
      }
    } catch { /* generic */ }
    return { error: "เรียกใช้งานไม่สำเร็จ" };
  }
  return data as Record<string, unknown>;
}

export function EmailSettingsForm({ myEmail }: { myEmail: string }) {
  const [loading, setLoading] = useState(true);
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState(465);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("ฝ่ายทรัพยากรบุคคล");
  const [fromEmail, setFromEmail] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [testTo, setTestTo] = useState(myEmail);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const cfg = (await callEmailConfig({ action: "get" })) as unknown as Cfg & { error?: string };
      if (!cfg.error) {
        setHost(cfg.smtp_host || "smtp.gmail.com");
        setPort(cfg.smtp_port || 465);
        setUser(cfg.smtp_user || "");
        setFromName(cfg.from_name || "ฝ่ายทรัพยากรบุคคล");
        setFromEmail(cfg.from_email || "");
        setEnabled(!!cfg.enabled);
        setHasPassword(!!cfg.has_password);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await callEmailConfig({
      action: "save",
      smtp_host: host,
      smtp_port: port,
      smtp_user: user,
      smtp_password: password, // ว่าง = ไม่เปลี่ยน
      from_name: fromName,
      from_email: fromEmail,
      enabled,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error as string);
      return;
    }
    if (password) setHasPassword(true);
    setPassword("");
    setMessage("บันทึกการตั้งค่าแล้ว");
  }

  async function test() {
    const to = testTo.trim();
    if (!to) {
      setError("กรุณากรอกอีเมลผู้รับสำหรับทดสอบ");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    // บันทึกก่อนทดสอบ เผื่อมีการแก้ไขที่ยังไม่ได้เซฟ
    const saved = await callEmailConfig({
      action: "save",
      smtp_host: host, smtp_port: port, smtp_user: user,
      smtp_password: password, from_name: fromName, from_email: fromEmail, enabled,
    });
    if (saved.error) {
      setBusy(false);
      setError(saved.error as string);
      return;
    }
    if (password) { setHasPassword(true); setPassword(""); }
    const result = await callEmailConfig({ action: "test", to });
    setBusy(false);
    if (result.error) {
      setError(result.error as string);
      return;
    }
    setMessage(`ส่งอีเมลทดสอบไปที่ ${to} สำเร็จ — กรุณาตรวจสอบกล่องจดหมาย`);
  }

  if (loading) return <Card><p className="text-sm text-stone-400">กำลังโหลด...</p></Card>;

  return (
    <Card className="max-w-xl">
      <div className="space-y-4">
        <label className="flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
          <input type="checkbox" className="mt-1" checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)} />
          <span>
            <b>เปิดใช้งานการส่งอีเมลผ่าน SMTP</b>
            <span className="mt-0.5 block text-xs text-stone-500">
              เมื่อปิด ระบบจะไม่ส่งอีเมล (บันทึกความพยายามไว้ใน log)
            </span>
          </span>
        </label>

        <Field label="อีเมลตัวกลางสำหรับส่ง (Gmail)" required
          hint="อีเมลที่ใช้เป็นผู้ส่ง เช่น hr.company@gmail.com">
          <Input type="email" value={user} onChange={(e) => setUser(e.target.value)}
            placeholder="hr.company@gmail.com" />
        </Field>

        <Field
          label="Gmail App Password"
          hint="ต้องเปิด 2-Step Verification ในบัญชี Google แล้วสร้าง App Password (16 ตัวอักษร) — ใช้แทนรหัสผ่านปกติ"
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? "•••••••• (ตั้งค่าไว้แล้ว — กรอกเพื่อเปลี่ยน)" : "กรอก App Password"}
            autoComplete="new-password"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อผู้ส่ง (แสดงในอีเมล)">
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </Field>
          <Field label="อีเมลผู้ส่ง (ไม่บังคับ)" hint="เว้นว่าง = ใช้อีเมลตัวกลาง">
            <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)}
              placeholder="เว้นว่างได้" />
          </Field>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-stone-500">ตั้งค่า SMTP ขั้นสูง (host / port)</summary>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Field label="SMTP Host">
              <Input value={host} onChange={(e) => setHost(e.target.value)} />
            </Field>
            <Field label="SMTP Port" hint="465 (SSL) หรือ 587 (STARTTLS)">
              <Select value={String(port)} onChange={(e) => setPort(Number(e.target.value))}>
                <option value="465">465 (SSL)</option>
                <option value="587">587 (STARTTLS)</option>
              </Select>
            </Field>
          </div>
        </details>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <div className="border-t border-stone-100 pt-4">
          <Button disabled={busy} onClick={save}>
            {busy ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </Button>
        </div>

        <div className="rounded-lg bg-stone-50 p-3">
          <Field label="ทดสอบการส่ง — ส่งอีเมลทดสอบไปที่"
            hint="ระบบจะบันทึกการตั้งค่าปัจจุบันก่อนแล้วลองส่งจริง 1 ฉบับ">
            <div className="flex gap-2">
              <Input type="email" value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com" />
              <Button variant="secondary" disabled={busy} onClick={test} className="shrink-0">
                {busy ? "กำลังส่ง..." : "ส่งอีเมลทดสอบ"}
              </Button>
            </div>
          </Field>
        </div>
      </div>
    </Card>
  );
}
