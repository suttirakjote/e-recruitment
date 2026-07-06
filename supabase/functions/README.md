# Supabase Edge Functions

ฟังก์ชันเหล่านี้ deploy อยู่บน Supabase project `ccngancgnxyyyvitinpc` แล้ว
(deploy ผ่าน Supabase MCP / `supabase functions deploy`)

| Function | verify JWT | หน้าที่ |
|---|---|---|
| `notify` | ❌ | ส่งอีเมลแจ้งเตือน — เรียกจาก DB trigger (pg_net) เลือก Gmail SMTP (nodemailer) ตาม `email_settings` หรือ fallback Resend |
| `email-config` | ✅ | อ่าน/บันทึก/ทดสอบ ค่า SMTP (hr_admin เท่านั้น, ไม่คืน password) |
| `admin-users` | ✅ | สร้าง/แก้ไข/รีเซ็ตรหัสผ่านบัญชี HR (hr_admin เท่านั้น) |
| `bootstrap-admin` | ❌ | สร้าง hr_admin คนแรก (ล็อกตัวเองหลังมี admin แล้ว) |

## Secrets ที่ต้องตั้ง (Supabase Dashboard → Edge Functions → Secrets)

- `SITE_URL` — URL ของเว็บหลัง deploy (เช่น `https://your-app.vercel.app`) ใช้สร้างลิงก์ในอีเมล
- `RESEND_API_KEY`, `EMAIL_FROM` — (ทางเลือก) ถ้าใช้ Resend เป็น fallback
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase ตั้งให้อัตโนมัติ

> หมายเหตุ: ในโฟลเดอร์นี้เก็บ source ของ `notify` ไว้เป็นตัวอย่าง ส่วน `email-config`,
> `admin-users`, `bootstrap-admin` เป็นเวอร์ชันที่ deploy อยู่บน Supabase — ดึง source
> กลับมาได้ผ่าน Supabase MCP (`get_edge_function`) หรือ `supabase functions download <name>`
