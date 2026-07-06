# E-Recruitment System

ระบบรับสมัครพนักงานภายในองค์กร — Next.js + Supabase
(ดูการออกแบบทั้งหมดใน [DESIGN.md](./DESIGN.md))

## โครงสร้าง

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS |
| Database / Auth / Storage | Supabase (project: `e-recruitment`, ref `ccngancgnxyyyvitinpc`, region ap-southeast-1) |
| อีเมลแจ้งเตือน | Resend ผ่าน Edge Function `notify` (trigger จาก pg_net) |
| Migrations | `supabase/migrations/*.sql` (apply แล้วทั้งหมด) |

## รันบนเครื่อง

```bash
npm install
npm run dev        # http://localhost:3000
```

ค่าเชื่อมต่อ Supabase อยู่ใน `.env.local` แล้ว (anon key เท่านั้น — ปลอดภัยที่จะอยู่ฝั่ง client)

## เส้นทางหลัก

- `/` , `/jobs` , `/track` , `/privacy-notice` — ฝั่งผู้สมัคร (ไม่ต้อง login)
- `/hr` — HR Portal (login ด้วยบัญชีที่ผู้ดูแลระบบสร้างให้)
- `/hr/settings/*` — เมนูตั้งค่า (เฉพาะ role `hr_admin`): ผู้ใช้ / แผนก & สายอนุมัติ / **ตั้งค่าอีเมล** / Privacy Notice / ทั่วไป

## Edge Functions (deploy บน Supabase แล้ว)

| Function | verify JWT | หน้าที่ |
|---|---|---|
| `notify` | ❌ | ส่งอีเมล — ถูกเรียกจาก DB trigger (ใบสมัครใหม่ / ถึงคิวอนุมัติ / ผลอนุมัติ / สถานะเปลี่ยน) พร้อมกันส่งซ้ำผ่าน `email_logs`. เลือกช่องทางตาม `email_settings`: ถ้าเปิด SMTP → Gmail SMTP (denomailer), ไม่งั้น fallback Resend |
| `email-config` | ✅ | อ่าน/บันทึก/ทดสอบ ค่า SMTP — เรียกจากหน้า `/hr/settings/email` (เช็ค `hr_admin`, ไม่ส่ง password กลับ client) |
| `admin-users` | ✅ | สร้าง/แก้ไข/รีเซ็ตรหัสผ่านบัญชี HR — เรียกจากหน้า `/hr/settings/users` (เช็คว่า caller เป็น `hr_admin`) |
| `bootstrap-admin` | ❌ | สร้าง `hr_admin` คนแรก — ล็อกตัวเองแล้ว (มี admin อยู่แล้วจะตอบ 403) |

## เปิดใช้งานอีเมล (Gmail SMTP — ตั้งค่าในระบบ)

ตั้งค่าได้เองในแอปที่ **Settings → ตั้งค่าอีเมล** (ไม่ต้องแตะ Supabase dashboard):

1. เปิด **2-Step Verification** ในบัญชี Google ที่จะใช้เป็นผู้ส่ง
2. สร้าง **App Password** (Google Account → Security → App passwords) จะได้รหัส 16 ตัวอักษร
3. ที่หน้า Settings → ตั้งค่าอีเมล: กรอกอีเมล Gmail ตัวกลาง + App Password + ชื่อผู้ส่ง → ติ๊ก "เปิดใช้งาน" → **บันทึก**
4. กด **ส่งอีเมลทดสอบ** เพื่อตรวจสอบว่าส่งได้จริง

- App Password เก็บในตาราง `email_settings` ที่ล็อก RLS (เข้าถึงได้เฉพาะ service role ผ่าน edge function) — ไม่ถูกส่งกลับมาแสดงฝั่ง client
- ระหว่างที่ยังไม่เปิด/ตั้งค่า ระบบทำงานปกติ — ความพยายามส่งอีเมลถูกบันทึกใน `email_logs` (status `failed` พร้อมสาเหตุ)
- ตั้งค่า secret `SITE_URL` ของ edge function (Supabase Dashboard) เป็น URL ของเว็บ เพื่อให้ลิงก์ในอีเมลชี้ถูกที่ (เช่น `https://your-app.vercel.app`)
- (ทางเลือก) ยังรองรับ Resend เป็น fallback ถ้าตั้ง secret `RESEND_API_KEY` + `EMAIL_FROM` และไม่ได้เปิด SMTP

> หมายเหตุ: Gmail ส่วนบุคคลมีลิมิตราว 500 ฉบับ/วัน — เหมาะกับช่วงทดลอง หากใช้งานจริงปริมาณมากแนะนำ Google Workspace หรือ Resend/SES ภายหลัง

## Deploy ขึ้น Vercel

1. push โค้ดขึ้น GitHub แล้ว import โปรเจกต์ใน Vercel
2. ตั้ง Environment Variables ตาม `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy แล้วนำ URL ไปใส่ใน secret `SITE_URL` ของ Edge Function

## เช็คลิสต์เริ่มใช้งาน (ทำในหน้า /hr หลัง login)

1. Settings → ทั่วไป: ตั้งชื่อองค์กร
2. Settings → Privacy Notice: ใส่ประกาศ PDPA ฉบับขององค์กร
3. Settings → ผู้ใช้งาน: สร้างบัญชี HR / ผู้อนุมัติ (เช่น IT Manager, COO, HR Manager)
4. Settings → แผนก & สายอนุมัติ: เพิ่มแผนก + ตั้งสายอนุมัติของแต่ละแผนก
5. ตำแหน่งงาน: สร้างตำแหน่ง + เลือก HR ผู้รับผิดชอบ + เปิดรับสมัคร
6. (แนะนำ) Supabase Dashboard → Auth → เปิด Leaked password protection

## Flow การทำงาน

```
ผู้สมัคร: /jobs → Apply (ฟอร์ม 7 ขั้น + CV + PDPA) → ได้ tracking code ทางอีเมล → /track
HR:      ใบสมัครใหม่ (อีเมลแจ้ง) → คัดกรอง → นัดสัมภาษณ์ → สัมภาษณ์เสร็จ
         → ส่งเข้าสายอนุมัติ → ผู้อนุมัติ level 1 → 2 → 3 (อีเมลแจ้งตามคิว)
         → อนุมัติครบ = approved → ส่งข้อเสนอ → hired (ปิดตำแหน่งด้วยมือผ่านปุ่ม "ปิดรับสมัคร" เท่านั้น — ไม่ปิดอัตโนมัติ)
```
