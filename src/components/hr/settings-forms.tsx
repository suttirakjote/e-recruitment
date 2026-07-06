"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { saveSetting } from "@/app/hr/(portal)/settings/actions";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_BRAND = "#047857";

/** ดึงสีเด่นจากรูปภาพ (โลโก้) โดยข้ามพิกเซลโปร่งใส/ขาว/ดำ/เทา แล้วเลือกสีที่ถี่ที่สุด */
function extractDominantColor(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 60;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue; // โปร่งใส
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max > 235 && min > 235) continue; // ขาว
          if (max < 30) continue; // ดำ
          if (max - min < 20) continue; // เทา (อิ่มตัวต่ำ)
          // quantize เพื่อจัดกลุ่มสีใกล้กัน
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const cur = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
          cur.count++; cur.r += r; cur.g += g; cur.b += b;
          buckets.set(key, cur);
        }
        if (buckets.size === 0) return resolve(null);
        let best: { count: number; r: number; g: number; b: number } | null = null;
        for (const v of buckets.values()) if (!best || v.count > best.count) best = v;
        if (!best) return resolve(null);
        const toHex = (n: number) =>
          Math.round(n / best!.count).toString(16).padStart(2, "0");
        resolve(`#${toHex(best.r)}${toHex(best.g)}${toHex(best.b)}`);
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export function PrivacyNoticeForm({ initialHtml }: { initialHtml: string }) {
  const [html, setHtml] = useState(initialHtml);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <Field
          label="เนื้อหาประกาศ (HTML)"
          hint="รองรับแท็ก HTML พื้นฐาน เช่น <h2>, <p>, <ul>, <li>, <b>"
        >
          <Textarea rows={24} value={html} onChange={(e) => setHtml(e.target.value)}
            className="font-mono text-xs" />
        </Field>
        <Button
          className="mt-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveSetting("privacy_notice_html", html);
              setMessage(result.ok ? "บันทึกแล้ว — แสดงผลที่หน้า /privacy-notice ทันที" : result.error);
            })
          }
        >
          {pending ? "กำลังบันทึก..." : "บันทึกประกาศ"}
        </Button>
        {message && <p className="mt-2 text-sm text-stone-500">{message}</p>}
      </Card>
      <Card>
        <p className="mb-3 text-sm font-medium text-stone-500">ตัวอย่างการแสดงผล</p>
        <div
          className="rounded-lg border border-stone-100 bg-stone-50 p-4 text-sm leading-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Card>
    </div>
  );
}

export function GeneralSettingsForm({
  initialOrgName,
  initialNotifyApplicant,
  initialLogoUrl,
  initialPrimaryColor,
}: {
  initialOrgName: string;
  initialNotifyApplicant: boolean;
  initialLogoUrl: string | null;
  initialPrimaryColor: string | null;
}) {
  const [orgName, setOrgName] = useState(initialOrgName);
  const [notifyApplicant, setNotifyApplicant] = useState(initialNotifyApplicant);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor || DEFAULT_BRAND);
  const [suggestedFromLogo, setSuggestedFromLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const logoInput = useRef<HTMLInputElement>(null);

  const hexOk = /^#[0-9a-fA-F]{6}$/.test(primaryColor);

  async function handleLogo(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError("ไฟล์โลโก้ต้องไม่เกิน 2MB");
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      setUploading(false);
      setError("อัปโหลดโลโก้ไม่สำเร็จ");
      return;
    }
    const saved = await saveSetting("org_logo_path", path);
    if (!saved.ok) {
      setUploading(false);
      setError(saved.error);
      return;
    }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    setLogoPreview(pub.publicUrl);

    // อ่านสีเด่นจากโลโก้มาแนะนำเป็นสี Primary
    const color = await extractDominantColor(file);
    if (color) {
      setPrimaryColor(color);
      setSuggestedFromLogo(true);
    }
    setUploading(false);
    setMessage("อัปโหลดโลโก้แล้ว" + (color ? " และอ่านสีจากโลโก้มาให้แล้ว (ปรับได้)" : ""));
  }

  return (
    <Card className="max-w-xl">
      <div className="space-y-5">
        <Field label="ชื่อองค์กร" hint="แสดงบนหน้าเว็บผู้สมัครและในอีเมลแจ้งเตือน">
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        </Field>

        <div>
          <Field label="โลโก้บริษัท" hint="แสดงบนหัวเว็บฝั่งผู้สมัคร (PNG/SVG/JPG ≤ 2MB)">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-stone-200 bg-stone-50">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="โลโก้" className="max-h-14 max-w-28 object-contain" />
                ) : (
                  <span className="text-xs text-stone-400">ยังไม่มีโลโก้</span>
                )}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => logoInput.current?.click()}
                className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200 disabled:opacity-50"
              >
                {uploading ? "กำลังอัปโหลด..." : logoPreview ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}
              </button>
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogo(f);
                  e.target.value = "";
                }}
              />
            </div>
          </Field>
        </div>

        <div>
          <Field
            label="สี Primary ของแบรนด์"
            hint={
              suggestedFromLogo
                ? "อ่านจากโลโก้ที่อัปโหลดให้แล้ว — ปรับเป็นสีที่ต้องการได้"
                : "สีหลักที่ใช้ทั่วเว็บ (ปุ่ม ลิงก์ หัวข้อ) — อัปโหลดโลโก้เพื่อให้ระบบแนะนำสีจากโลโก้"
            }
          >
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={hexOk ? primaryColor : DEFAULT_BRAND}
                onChange={(e) => {
                  setPrimaryColor(e.target.value);
                  setSuggestedFromLogo(false);
                }}
                className="h-10 w-14 cursor-pointer rounded border border-stone-300"
              />
              <Input
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value);
                  setSuggestedFromLogo(false);
                }}
                className="w-32 font-mono"
                placeholder="#047857"
              />
              <button
                type="button"
                onClick={() => { setPrimaryColor(DEFAULT_BRAND); setSuggestedFromLogo(false); }}
                className="text-xs text-stone-500 hover:text-stone-700"
              >
                คืนค่าเริ่มต้น
              </button>
              <span
                className="ml-auto rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: hexOk ? primaryColor : DEFAULT_BRAND }}
              >
                ตัวอย่างปุ่ม
              </span>
            </div>
          </Field>
          {!hexOk && (
            <p className="mt-1 text-xs text-rose-600">รูปแบบสีต้องเป็น #RRGGBB เช่น #047857</p>
          )}
        </div>

        <label className="flex items-start gap-2 border-t border-stone-100 pt-4 text-sm text-stone-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={notifyApplicant}
            onChange={(e) => setNotifyApplicant(e.target.checked)}
          />
          ส่งอีเมลแจ้งผู้สมัครอัตโนมัติเมื่อสถานะสำคัญเปลี่ยน
          (นัดสัมภาษณ์ / ส่งข้อเสนอ / รับเข้าทำงาน / ไม่ผ่านการพิจารณา)
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <Button
          disabled={pending || !hexOk}
          onClick={() =>
            startTransition(async () => {
              const results = await Promise.all([
                saveSetting("org_name", orgName),
                saveSetting("notify_applicant_on_status_change", notifyApplicant),
                saveSetting("primary_color", primaryColor),
              ]);
              const ok = results.every((r) => r.ok);
              setMessage(ok ? "บันทึกแล้ว — รีเฟรชหน้าเพื่อดูสีใหม่" : "บันทึกไม่สำเร็จ");
            })
          }
        >
          {pending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </Button>
      </div>
    </Card>
  );
}
