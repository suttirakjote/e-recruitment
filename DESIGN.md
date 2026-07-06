# E-Recruitment System — Design Document

> ระบบรับสมัครพนักงานภายในองค์กร แบ่งผู้ใช้เป็น 2 ฝั่ง: **ผู้สมัครงาน (Public)** และ **พนักงาน HR / ผู้อนุมัติ (Internal)**
> ช่วงทดลองใช้งาน deploy บน **Supabase** (Postgres + Auth + Storage + Edge Functions)

---

## 1. สถาปัตยกรรมรวม (Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js (App Router)                │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │  Public Site          │  │  HR Portal (/hr/*)      │  │
│  │  /jobs, /apply, /track│  │  ต้อง login (Supabase   │  │
│  │  ไม่ต้อง login        │  │  Auth + role)           │  │
│  └──────────────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────┘
                             │ supabase-js
┌────────────────────────────▼────────────────────────────┐
│                        Supabase                          │
│  • Postgres + RLS (Row Level Security)                   │
│  • Auth (HR users เท่านั้น — ผู้สมัครไม่ต้องมี account)   │
│  • Storage (bucket `cv-files` แบบ private + signed URL)  │
│  • Edge Functions:                                       │
│      - notify-new-application → ส่งอีเมลแจ้ง HR          │
│      - track-application → ผู้สมัครเช็คสถานะ             │
│      - notify-status-change → แจ้งผู้สมัคร (optional)    │
│  • Database Webhooks → trigger Edge Function             │
└─────────────────────────────────────────────────────────┘
                             │
                    Email Provider (Resend แนะนำ / หรือ SMTP องค์กร)
```

**เหตุผลการตัดสินใจสำคัญ:**
- **ผู้สมัครไม่ต้องสมัคร account** — ลด friction, ใช้ email + tracking code ติดตามสถานะแทน
- **การเช็คสถานะด้วย email อย่างเดียวไม่ปลอดภัย** (ใครก็เดา email คนอื่นได้) → ระบบจะออก **Tracking Code** (เช่น `APP-2026-XK7M9Q`) ให้ตอน submit และส่งไปในอีเมลยืนยัน ผู้สมัครใช้ **email + tracking code** คู่กันเพื่อเช็คสถานะ
- **CV เก็บใน private bucket** — เข้าถึงผ่าน signed URL ที่ HR ที่ login แล้วเท่านั้นขอได้
- **ฟอร์มใบสมัคร** เก็บ field หลักเป็น column ปกติ (ชื่อ, email, เบอร์) ส่วน field ตามฟอร์ม PDF ขององค์กรเก็บเป็น `jsonb` → รอปรับ schema ตามไฟล์ PDF ที่จะส่งมา โดยไม่ต้อง migrate ใหญ่

---

## 2. Database Schema

### 2.1 Enums

```sql
create type job_status as enum ('draft', 'open', 'on_hold', 'closed');

create type application_status as enum (
  'submitted',          -- ส่งใบสมัครแล้ว
  'screening',          -- HR กำลังคัดกรอง
  'shortlisted',        -- ผ่านการคัดกรอง
  'interview_scheduled',-- นัดสัมภาษณ์แล้ว
  'interviewed',        -- สัมภาษณ์เสร็จ
  'pending_approval',   -- รอสาย approve ตามแผนก
  'approved',           -- อนุมัติครบทุก level → เตรียม offer
  'offer_sent',         -- ส่ง offer แล้ว
  'hired',              -- รับเข้าทำงาน
  'rejected',           -- ไม่ผ่าน
  'withdrawn'           -- ผู้สมัครถอนตัว
);

create type approval_decision as enum ('pending', 'approved', 'rejected');

create type hr_role as enum ('hr_admin', 'hr_staff', 'approver', 'viewer');
```

### 2.2 ตารางหลัก

```sql
-- แผนก
create table departments (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,          -- 'IT', 'FIN', 'MKT'
  name_th     text not null,
  name_en     text,
  created_at  timestamptz not null default now()
);

-- ผู้ใช้ภายใน (HR + ผู้อนุมัติ) — ผูกกับ auth.users
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  role          hr_role not null default 'viewer',
  job_title     text,                        -- 'IT Manager', 'COO', 'HR Manager'
  department_id uuid references departments(id),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ตำแหน่งงานที่เปิดรับ
create table jobs (
  id              uuid primary key default gen_random_uuid(),
  department_id   uuid not null references departments(id),
  title           text not null,
  description     text,                      -- รายละเอียดงาน (markdown)
  requirements    text,                      -- คุณสมบัติ
  employment_type text default 'full_time',  -- full_time / part_time / contract / intern
  location        text,
  salary_range    text,                      -- แสดงหรือไม่แสดงก็ได้
  openings        int not null default 1,    -- จำนวนที่รับ
  status          job_status not null default 'draft',
  published_at    timestamptz,
  closed_at       timestamptz,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- HR ผู้รับผิดชอบแต่ละตำแหน่ง (รับอีเมลแจ้งเตือนเมื่อมีใบสมัครใหม่)
create table job_recruiters (
  job_id     uuid not null references jobs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (job_id, profile_id)
);

-- ใบสมัคร
create table applications (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references jobs(id),
  tracking_code  text unique not null,       -- 'APP-2026-XK7M9Q' สร้างจาก trigger
  -- ข้อมูลหลักของผู้สมัคร (field คงที่)
  first_name     text not null,
  last_name      text not null,
  email          text not null,
  phone          text not null,
  -- field ตามฟอร์ม PDF ขององค์กร — ยืดหยุ่น รอ map จากไฟล์ตัวอย่าง
  form_data      jsonb not null default '{}',
  status         application_status not null default 'submitted',
  pdpa_consent   boolean not null default false,
  pdpa_consent_at timestamptz,
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (job_id, email)                     -- กันสมัครซ้ำตำแหน่งเดิม
);

-- ไฟล์แนบ (CV, transcript, รูปถ่าย ฯลฯ)
create table application_files (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  file_type      text not null default 'cv', -- cv / transcript / photo / other
  storage_path   text not null,              -- path ใน bucket cv-files
  file_name      text not null,
  file_size      int,
  uploaded_at    timestamptz not null default now()
);

-- ประวัติการเปลี่ยนสถานะ (timeline ให้ทั้ง HR และผู้สมัครเห็น)
create table application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  from_status    application_status,
  to_status      application_status not null,
  changed_by     uuid references profiles(id),  -- null = ระบบ/ผู้สมัครเอง
  note           text,                           -- โน้ตภายใน (ไม่แสดงให้ผู้สมัคร)
  public_note    text,                           -- ข้อความที่แสดงให้ผู้สมัครเห็น
  created_at     timestamptz not null default now()
);

-- คอมเมนต์/โน้ตภายในของ HR ต่อผู้สมัคร (เช่น ผลสัมภาษณ์)
create table application_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_id      uuid not null references profiles(id),
  body           text not null,
  created_at     timestamptz not null default now()
);
```

### 2.3 ระบบ Approval ตามแผนก

```sql
-- นิยามสาย approve ของแต่ละแผนก (template)
create table approval_flows (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  name          text not null,               -- 'IT hiring flow'
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (department_id, is_active)          -- 1 flow active ต่อแผนก (partial index จริงตอน implement)
);

-- ขั้นตอนในแต่ละ flow เรียงตาม level
create table approval_flow_steps (
  id           uuid primary key default gen_random_uuid(),
  flow_id      uuid not null references approval_flows(id) on delete cascade,
  level        int not null,                 -- 1, 2, 3 ...
  step_title   text not null,                -- 'IT Manager', 'COO', 'HR Manager'
  approver_id  uuid not null references profiles(id),  -- ผู้อนุมัติตัวจริง
  unique (flow_id, level)
);

-- instance การ approve ของใบสมัครแต่ละใบ
-- สร้างอัตโนมัติ (snapshot จาก flow_steps) เมื่อ HR กดส่งเข้าสาย approve
create table application_approvals (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  level          int not null,
  step_title     text not null,              -- snapshot ไว้ เผื่อ flow ถูกแก้ภายหลัง
  approver_id    uuid not null references profiles(id),
  decision       approval_decision not null default 'pending',
  comment        text,
  decided_at     timestamptz,                -- วัน-เวลาที่กด approve/reject
  created_at     timestamptz not null default now(),
  unique (application_id, level)
);
```

**กติกาของ approval (บังคับด้วย function/trigger + ตรวจซ้ำที่ UI):**
1. เมื่อ HR เปลี่ยนสถานะใบสมัครเป็น `pending_approval` → ระบบ copy ขั้นตอนจาก `approval_flow_steps` ของแผนกนั้นมาสร้างแถวใน `application_approvals` (snapshot — แก้ flow ทีหลังไม่กระทบใบที่กำลังวิ่งอยู่)
2. อนุมัติ **ตามลำดับ level** — level 2 กดได้ต่อเมื่อ level 1 approved แล้ว
3. ถ้า level ใด reject → ใบสมัครกลับเป็น `rejected` (หรือ HR ตัดสินใจต่อ) และบันทึกเหตุผล
4. ครบทุก level → สถานะเปลี่ยนเป็น `approved` อัตโนมัติ + แจ้งอีเมล HR ผู้รับผิดชอบ
5. หน้า UI แสดง timeline: ✅ IT Manager (สมชาย) — 3 ก.ค. 2026 14:32 → ⏳ COO — รอดำเนินการ → ⬜ HR Manager

### 2.4 อีเมลแจ้งเตือน

```sql
-- log การส่งอีเมล (debug + audit)
create table email_logs (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  template    text not null,       -- 'new_application', 'approval_request', 'status_update'
  ref_id      uuid,                -- application_id
  status      text not null,       -- 'sent' / 'failed'
  error       text,
  created_at  timestamptz not null default now()
);
```

**Trigger points:**
| เหตุการณ์ | ผู้รับอีเมล |
|---|---|
| ผู้สมัคร submit ใบสมัคร | HR ใน `job_recruiters` ของตำแหน่งนั้น + อีเมลยืนยันไปหาผู้สมัคร (มี tracking code) |
| ใบสมัครเข้าสาย approve | ผู้อนุมัติ level ถัดไปที่ถึงคิว |
| Approve ครบ / ถูก reject | HR ผู้รับผิดชอบ |
| HR เปลี่ยนสถานะสำคัญ (นัดสัมภาษณ์, ผล) | ผู้สมัคร (optional, เปิด-ปิดได้) |

### 2.5 Row Level Security (แนวทาง)

| ตาราง | anon (ผู้สมัคร) | authenticated (HR) |
|---|---|---|
| `jobs` | SELECT เฉพาะ `status = 'open'` | ทั้งหมด (เขียนได้ตาม role) |
| `departments` | SELECT | ทั้งหมด |
| `applications` | INSERT เท่านั้น (**ห้าม SELECT** — เช็คสถานะผ่าน Edge Function ด้วย email + tracking code) | SELECT/UPDATE ตาม role |
| `application_files` | INSERT (ผ่าน storage policy) | SELECT ผ่าน signed URL |
| `application_approvals` | ❌ | approver เห็น/แก้เฉพาะแถวของตัวเอง, hr_admin เห็นหมด |
| `approval_flows/steps` | ❌ | hr_admin จัดการ |
| `profiles` | ❌ | เห็นกันเองภายใน |

- ป้องกัน spam ใบสมัคร: rate limit ที่ Edge Function / Turnstile (Cloudflare CAPTCHA) ที่หน้า apply

---

## 3. Frontend

**Stack แนะนำ:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + supabase-js
Deploy: **Vercel** (ฟรี tier พอสำหรับช่วงทดลอง) — Supabase เป็น backend อย่างเดียว

### 3.1 ฝั่งผู้สมัคร (Public — ไม่ต้อง login)

| Route | หน้า | รายละเอียด |
|---|---|---|
| `/` | Landing | แนะนำบริษัท + ปุ่มดูตำแหน่งงาน |
| `/jobs` | ตำแหน่งงานทั้งหมด | card list เฉพาะ `open`, filter ตามแผนก/ประเภท, search |
| `/jobs/[id]` | รายละเอียดตำแหน่ง | คำอธิบาย, คุณสมบัติ, ปุ่ม **Apply** |
| `/jobs/[id]/apply` | ฟอร์มสมัคร | multi-step form: ① ข้อมูลส่วนตัว ② ประวัติการศึกษา/ทำงาน (ตามฟอร์ม PDF) ③ อัปโหลด CV ④ PDPA consent + review → submit |
| `/apply/success` | ยืนยันการสมัคร | แสดง **tracking code** + แจ้งว่าส่งไปที่อีเมลแล้ว |
| `/track` | ติดตามสถานะ | กรอก email + tracking code → เห็น timeline สถานะ (submitted → screening → ... ) |

### 3.2 ฝั่ง HR (ต้อง login — `/hr/*`)

| Route | หน้า | รายละเอียด |
|---|---|---|
| `/hr` | Dashboard | ภาพรวม: ตำแหน่งเปิดอยู่กี่ตำแหน่ง, ใบสมัครใหม่สัปดาห์นี้, รอ approve กี่ใบ, funnel chart |
| `/hr/jobs` | จัดการตำแหน่ง | ตาราง: ตำแหน่ง / แผนก / สถานะ / **จำนวนผู้สมัคร** (badge แยกตามสถานะ) / toggle เปิด-ปิด |
| `/hr/jobs/new`, `/hr/jobs/[id]/edit` | สร้าง/แก้ตำแหน่ง | ฟอร์ม + เลือก HR ผู้รับผิดชอบ (job_recruiters) |
| `/hr/jobs/[id]` | ภาพรวมตำแหน่ง | Kanban/list ผู้สมัครของตำแหน่งนี้แยกตามสถานะ |
| `/hr/applications` | ใบสมัครทั้งหมด | ตาราง filter ตามตำแหน่ง/สถานะ/ช่วงเวลา |
| `/hr/applications/[id]` | รายละเอียดผู้สมัคร | ข้อมูลฟอร์มทั้งหมด, **preview CV ในหน้า** (PDF viewer + signed URL), timeline สถานะ, โน้ตภายใน, ปุ่มเปลี่ยนสถานะ, ปุ่ม "ส่งเข้าสาย Approve" |
| `/hr/approvals` | คิวรอฉันอนุมัติ | เฉพาะ role approver — list ใบที่ถึงคิวตัวเอง + ปุ่ม Approve/Reject + comment |
| `/hr/settings/flows` | ตั้งค่าสาย approve | hr_admin กำหนด flow ต่อแผนก: ลาก level 1→2→3 เลือกผู้อนุมัติ |
| `/hr/settings/users` | จัดการผู้ใช้ภายใน | เชิญ HR/approver, กำหนด role |

### 3.3 UI ส่วนสำคัญ

- **Approval timeline component**: stepper แนวตั้ง แสดงชื่อ + ตำแหน่ง + วันเวลา approve + comment ของแต่ละ level
- **Status badge** สีตามสถานะ ใช้ร่วมกันทุกหน้า
- **Kanban board** ต่อตำแหน่ง (ลากเปลี่ยนสถานะได้ = อัปเดต status + เขียน history อัตโนมัติ)
- ภาษา: เริ่ม **ไทยเป็นหลัก** โครงสร้างรองรับ i18n ภายหลัง

---

## 4. Feature เพิ่มเติมที่ออกแบบเผื่อไว้ (แนะนำ)

1. **PDPA consent** (จำเป็นตามกฎหมายไทย) — checkbox + เก็บ timestamp, กำหนดนโยบายลบข้อมูลผู้สมัครที่ไม่ผ่านหลัง X เดือน (scheduled job)
2. **โน้ตภายใน + ผลสัมภาษณ์** — HR/กรรมการบันทึกความเห็นในใบสมัคร (มีแล้วใน schema: `application_notes`)
3. **อีเมลแจ้งผู้สมัครอัตโนมัติ** เมื่อสถานะเปลี่ยน (เปิด-ปิดได้ต่อสถานะ)
4. **Talent pool** — ผู้สมัครที่ไม่ผ่านแต่น่าสนใจ flag เก็บไว้ค้นหาตอนเปิดตำแหน่งใหม่
5. **Audit log** — ใครแก้อะไรเมื่อไหร่ (สำคัญกับระบบ approve)
6. **กันสมัครซ้ำ** — unique (job_id, email) + แจ้งผู้สมัครว่าเคยสมัครแล้ว
7. ~~Auto-close~~ — **ยกเลิกแล้ว** (2026-07) เดิมออกแบบให้ปิดตำแหน่งอัตโนมัติเมื่อ hired ครบ `openings` แต่พบปัญหาตำแหน่งปิดเองโดยไม่ตั้งใจ จึงเปลี่ยนเป็น **ปิดด้วยมือเท่านั้น** ผ่านปุ่ม "ปิดรับสมัคร" ที่ HR กดเอง
8. Phase ถัดไป (ยังไม่ทำช่วงทดลอง): นัดสัมภาษณ์ + ปฏิทิน, scoring rubric, รายงาน/export Excel, SSO องค์กร (Google Workspace / Azure AD)

---

## 5. แผนการสร้าง (Phases)

| Phase | ขอบเขต | ผลลัพธ์ |
|---|---|---|
| **1. Foundation** | Supabase project, schema + RLS + storage, seed แผนก, Next.js scaffold, HR auth | โครงระบบพร้อม |
| **2. Public site** | หน้า jobs, รายละเอียด, ฟอร์มสมัคร (รอ map จาก PDF), upload CV, tracking code, อีเมลแจ้ง HR | ผู้สมัครใช้งานได้จริง |
| **3. HR portal** | Dashboard, จัดการตำแหน่ง, รายละเอียดผู้สมัคร + CV viewer, เปลี่ยนสถานะ + timeline | HR ทำงานได้ครบ loop คัดกรอง |
| **4. Approval workflow** | ตั้งค่า flow ต่อแผนก, คิว approve, sequential enforcement, อีเมลแจ้งผู้อนุมัติ | ครบ requirement approve |
| **5. Polish** | หน้า /track ของผู้สมัคร, อีเมลแจ้งผู้สมัคร, PDPA retention, audit log | พร้อมทดลองใช้จริง |

---

## 6. การตัดสินใจ (ล็อกแล้ว — 2026-07-04)

| เรื่อง | ข้อสรุป |
|---|---|
| ฟอร์มใบสมัคร | ✅ ได้ PDF แล้ว — map ครบใน **ส่วนที่ 7** (ตัดชื่อบริษัทเดิมออกทั้งหมด) |
| Email provider | ✅ **Resend** |
| HR login | ✅ **email/password** — ไม่มี self-signup, ผู้ดูแลระบบ (hr_admin) เป็นคนสร้าง account ให้ผ่านหน้า `/hr/settings/users` (ใช้ Supabase Admin API เชิญ + ตั้งรหัสผ่านครั้งแรกผ่านลิงก์อีเมล) |
| รายชื่อแผนก | ✅ **config เองในระบบ** — หน้า `/hr/settings/departments` (CRUD แผนก) ไม่ hardcode seed |
| สาย approve | ✅ **config เองในระบบ ตั้งค่าที่ระดับแผนก** — หน้า `/hr/settings/departments/[id]/flow` กำหนด level + ผู้อนุมัติของแผนกนั้น |
| Privacy Notice | ✅ **config เองในระบบ** — หน้า `/hr/settings/privacy-notice` (rich text editor) แสดงผลที่หน้า public `/privacy-notice` |

### ตารางเพิ่มสำหรับ config

```sql
-- เก็บ setting ทั่วไปของระบบ (privacy notice, ชื่อองค์กร, โลโก้, เปิด/ปิดอีเมลแจ้งผู้สมัคร)
create table site_settings (
  key        text primary key,      -- 'privacy_notice_html', 'org_name', 'org_logo_path', ...
  value      jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
```

**ผลต่อ UI settings** — เมนู Settings ฝั่ง HR (เฉพาะ `hr_admin`) มี 4 หน้า:
1. `/hr/settings/users` — สร้าง/จัดการ account HR + กำหนด role
2. `/hr/settings/departments` — CRUD แผนก + ตั้งสาย approve ในหน้าแผนก (แท็บ "Approval Flow")
3. `/hr/settings/privacy-notice` — แก้ไขข้อความ Privacy Notice (มี placeholder เริ่มต้นให้)
4. `/hr/settings/general` — ชื่อองค์กร, โลโก้, ตั้งค่าอีเมลแจ้งเตือน

---

## 7. สเปคฟอร์มใบสมัคร (map จากฟอร์ม PDF ปัจจุบัน 14 หน้า)

> **ข้อกำหนดสำคัญ:** ตัดชื่อบริษัทเดิม โลโก้ และแบรนด์ในเครือออก**ทั้งหมด** — ใช้ชื่อ/โลโก้กลางขององค์กร (config ได้)
> ฟอร์มออนไลน์แบ่งเป็น **7 step** ผู้สมัครกรอกทีละส่วน มี progress bar และ save draft ใน localStorage

### Step 1 — ข้อมูลการสมัคร (Application Info)

| Field | ชนิด | หมายเหตุ |
|---|---|---|
| ตำแหน่งที่สมัคร 1 | auto | ดึงจากตำแหน่งที่กด Apply |
| ตำแหน่งที่สมัคร 2 (สำรอง) | dropdown (optional) | เลือกจากตำแหน่งที่เปิดอยู่ |
| เงินเดือนที่ต้องการ | number | บาท/เดือน |
| พร้อมจะทำงานที่ | checkbox: ในเขตกรุงเทพฯ / ต่างประเทศ (ระบุ) / อื่นๆ แล้วแต่บริษัทพิจารณา | |
| ทราบข่าวการรับสมัครจาก | dropdown + อื่นๆ | ใช้ทำสถิติช่องทางรับสมัครได้ |
| รูปถ่าย | file upload (jpg/png ≤ 2MB) | เก็บใน `application_files` type `photo` |

### Step 2 — ประวัติส่วนตัว (Personal Data)

| กลุ่ม | Fields |
|---|---|
| ชื่อ | คำนำหน้า (นาย/นาง/นางสาว), ชื่อ-นามสกุล (ไทย), Name-Surname (อังกฤษ) |
| ข้อมูลบุคคล | วันเดือนปีเกิด, เพศ, อายุ (**คำนวณอัตโนมัติ**จากวันเกิด), สัญชาติ, ศาสนา*, ส่วนสูง (ซม.), น้ำหนัก (กก.), กรุ๊ปเลือด* |
| บัตรประชาชน | เลขบัตร 13 หลัก (validate checksum), สถานที่ออกบัตร, วันออกบัตร, วันหมดอายุ |
| ติดต่อ | โทรศัพท์บ้าน*, ที่ทำงาน*, มือถือ, E-mail (**ใช้เป็น key ติดตามสถานะ**) |
| ที่อยู่ | ที่อยู่ปัจจุบัน, ที่อยู่ตามทะเบียนบ้าน (checkbox "เหมือนที่อยู่ปัจจุบัน") |
| ที่พักอาศัย | อยู่กับบิดามารดา / บ้านของตนเอง / หอพัก-บ้านเช่า / อื่นๆ |
| สถานภาพสมรส | โสด / แต่งงาน / แต่งงานไม่จดทะเบียน / หม้าย / หย่า / แยกกันอยู่ |
| คู่สมรส-บุตร | คู่สมรสมีรายได้หรือไม่ (บาท/เดือน), จำนวนบุตร + อายุบุตรแต่ละคน (array) |
| ภาวะทางทหาร | ผ่านการเกณฑ์ทหารแล้ว / ได้รับการยกเว้น (เหตุผล) / อื่นๆ — **แสดงเฉพาะเพศชาย** |

`*` = ข้อมูล optional (ศาสนา/กรุ๊ปเลือดเป็น sensitive data ตาม PDPA — ให้กรอกโดยสมัครใจ)

### Step 3 — ครอบครัว & ผู้ติดต่อฉุกเฉิน (Family Data)

- ตาราง repeatable: บิดา / มารดา / คู่สมรส / พี่ (ระบุจำนวน) / น้อง (ระบุจำนวน)
  - แต่ละแถว: ชื่อ-นามสกุล, อายุ, อาชีพ/ตำแหน่ง, ที่ทำงาน, โทรศัพท์
- กรณีเร่งด่วนติดต่อ: ชื่อ-นามสกุล, ความสัมพันธ์, โทรศัพท์
- checkbox รับรอง: "ได้รับความยินยอมจากบุคคลข้างต้นในการเปิดเผยข้อมูลแก่บริษัท" (ตามฟอร์มเดิม)

### Step 4 — การศึกษา & การฝึกอบรม (Education & Training)

- ตารางการศึกษา (กรอกเฉพาะระดับที่มี): ประถม / ม.ต้น / ม.ปลาย / ปวช. / ปวส. / ปริญญาตรี / โท+ / เอก
  - แต่ละแถว: ปีที่เริ่ม-จบ, ชื่อสถานศึกษาและที่ตั้ง, วุฒิที่ได้รับ, วิชาเอก, เกรดเฉลี่ย
- ใบประกอบวิชาชีพ (text)
- การฝึกอบรม/สัมมนา (repeatable): ชื่อหลักสูตร, หน่วยงานผู้จัด, วุฒิที่ได้รับ, ระยะเวลา

### Step 5 — ทักษะ & ภาษา (Skills & Language)

- ภาษา: อังกฤษ + เพิ่มภาษาอื่นได้ — ฟัง/พูด/อ่าน/เขียน ระดับ ดีมาก/ดี/พอใช้
- คะแนนภาษา: TOEIC / TOEFL / IELTS / อื่นๆ, คะแนนภาษาจีน, ภาษาอื่นๆ
- ทักษะคอมพิวเตอร์, กีฬา, ความสามารถพิเศษอื่นๆ, การใช้เครื่องใช้สำนักงาน
- รถยนต์/มอเตอร์ไซค์ส่วนตัวที่ใช้ในธุระบริษัทได้: มี/ไม่มี (แยกประเภท)
- ใบขับขี่: รถยนต์ (ประเภท) / มอเตอร์ไซค์: มี/ไม่มี

### Step 6 — ประสบการณ์ทำงาน & ข้อมูลเพิ่มเติม

- **ประสบการณ์ทำงาน** (repeatable, เรียงจากปัจจุบันไปหาอดีต):
  ชื่อบริษัท, ตำแหน่ง, ประเภทการจ้าง (ประจำ/ชั่วคราว/ฝึกงาน), วันที่เข้า-ออก, เงินเดือน, รายได้พิเศษอื่นๆ, เหตุผลในการลาออก, ลักษณะงานที่รับผิดชอบ
- เริ่มงานได้เมื่อไหร่ (date)
- ยินยอม/ไม่ยินยอม ให้ตรวจสอบประวัติกับนายจ้างเดิม
- **ข้อมูลเพิ่มเติม (Further Information)** — 6 ข้อ ตอบ ไม่เคย/เคย + รายละเอียด:
  1. เคยถูกให้ออกจากงานหรือไม่
  2. เคยป่วยหนัก/โรคติดต่อร้ายแรงหรือไม่*
  3. เคยได้รับโทษทางอาญา/จำคุก/ล้มละลายหรือไม่*
  4. ขณะนี้ตั้งครรภ์หรือไม่ (ระบุเดือน)*
  5. มีเพื่อน/ญาติที่ทำงานในบริษัทนี้หรือไม่ (ระบุชื่อ)
  6. เป็นสมาชิกสมาคม/องค์กรวิชาชีพใด ตำแหน่งอะไร
- **บุคคลอ้างอิง 2 คน** (ที่ไม่ใช่ญาติ/นายจ้างเดิม): ชื่อ, ที่อยู่, โทรศัพท์, อาชีพ + checkbox รับรองความยินยอม
- แนะนำตัวเอง (textarea)
- ผู้แนะนำ/ผู้รับรอง (optional): ชื่อ-นามสกุล, ความสัมพันธ์, ตำแหน่ง, ที่อยู่ที่ทำงาน/โทร
- **แบบสอบถาม 8 ข้อ** (จากหน้า 14 ของฟอร์มเดิม — textarea ทั้งหมด):
  1. ได้รับอะไรจากสถาบันการศึกษาที่เป็นประโยชน์ต่อการทำงานในอนาคต
  2. ความสำเร็จที่ผ่านมาที่ภูมิใจสูงสุด
  3. ความล้มเหลว/ความผิดหวัง/อุปสรรคในการทำงานที่ผ่านมา
  4. คุณสมบัติเด่นของท่าน
  5. ผู้บังคับบัญชาที่มีลักษณะผู้นำแบบใดที่ชอบ
  6. จุดอ่อนที่ต้องปรับปรุง
  7. เป้าหมายในชีวิตส่วนตัว
  8. ลักษณะงานแบบใดที่ชอบ เพราะเหตุใด

`*` = คำถาม sensitive (สุขภาพ/ประวัติอาชญากรรม/การตั้งครรภ์) — คงไว้ตามฟอร์มเดิม แต่ผูกกับ PDPA sensitive consent ใน Step 7 (ถ้าไม่ให้ consent ให้ข้ามคำถามกลุ่มนี้)

### Step 7 — เอกสารแนบ + PDPA Consent + Review

- **อัปโหลดเอกสาร**: CV/Resume (**บังคับ**, pdf/doc ≤ 5MB) + optional: สำเนาบัตรประชาชน, ทะเบียนบ้าน, Transcript, ใบรับรองการผ่านงาน, ใบรับรองแพทย์, ทะเบียนสมรส, หลักฐานทางทหาร, ใบขับขี่, อื่นๆ (ตาม checklist ฟอร์มเดิม)
- checkbox รับรอง "ข้อความทั้งหมดเป็นความจริง หากไม่เป็นความจริงบริษัทมีสิทธิ์เลิกจ้างโดยไม่จ่ายชดเชย" (แทนลายมือชื่อ — บันทึก timestamp)
- **PDPA Consent 3 รายการ** (แสดง Privacy Notice ฉบับองค์กรใหม่แบบ scroll/link):
  1. ยินยอมให้ประมวลผลข้อมูลส่วนบุคคลทั่วไป เพื่อพิจารณาตำแหน่งที่เหมาะสมและแจ้งเตือนเมื่อมีประกาศรับสมัครใหม่ — ยินยอม/ไม่ยินยอม
  2. ยินยอมให้ประมวลผลข้อมูล**ที่มีความอ่อนไหว** (ศาสนา สุขภาพ ประวัติอาชญากรรม กรุ๊ปเลือด ฯลฯ) — ยินยอม/ไม่ยินยอม
  3. รับทราบประกาศคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice) — บังคับติ๊กก่อน submit
- หน้า Review สรุปข้อมูลทั้งหมดก่อน Submit

### โครงสร้าง `form_data` (jsonb)

```jsonc
{
  "application": { "position2_job_id": null, "expected_salary": 30000,
                   "work_location": ["bangkok"], "source": "jobsdb" },
  "personal":    { "title": "นาย", "name_th": "...", "name_en": "...",
                   "birth_date": "1998-05-01", "gender": "male",
                   "nationality": "ไทย", "religion": null, "height_cm": 175,
                   "weight_kg": 68, "blood_type": null,
                   "id_card": { "no": "...", "issued_at": "...", "issued_date": "...", "expiry_date": "..." },
                   "phones": { "home": null, "office": null, "mobile": "..." },
                   "address_present": "...", "address_registered": "...",
                   "residence_type": "rented", "marital_status": "single",
                   "spouse_income": null, "children": { "count": 0, "ages": [] },
                   "military_status": "completed" },
  "family":      { "members": [ { "relation": "father", "name": "...", "age": 60,
                                  "occupation": "...", "office": "...", "tel": "..." } ],
                   "emergency": { "name": "...", "relationship": "...", "tel": "..." },
                   "family_consent_certified": true },
  "education":   { "records": [ { "level": "bachelor", "from": "2016", "to": "2020",
                                  "institute": "...", "degree": "...", "major": "...", "gpa": "3.25" } ],
                   "professional_license": null,
                   "trainings": [ { "course": "...", "organizer": "...", "certificate": "...", "duration": "..." } ] },
  "skills":      { "languages": [ { "name": "English", "listening": "good", "speaking": "good",
                                    "reading": "excellent", "writing": "good" } ],
                   "test_scores": { "toeic": null, "toefl": null, "ielts": null, "chinese": null, "other": null },
                   "computer": "...", "sports": "...", "special": "...", "office_equipment": "...",
                   "vehicle": { "car": false, "motorcycle": true },
                   "driving_license": { "car": null, "motorcycle": true } },
  "experience":  { "records": [ { "company": "...", "position": "...", "employment_type": "full_time",
                                  "start": "2020-06", "end": "2023-01", "salary": 25000,
                                  "allowances": "...", "leaving_reason": "...", "description": "..." } ],
                   "available_start_date": "2026-08-01",
                   "consent_check_previous_employer": true },
  "further":     { "discharged": { "answer": false, "detail": null },
                   "serious_illness": { "answer": false, "detail": null },
                   "criminal_record": { "answer": false, "detail": null },
                   "pregnant": { "answer": false, "months": null },
                   "relatives_in_company": { "answer": false, "names": null },
                   "associations": null,
                   "references": [ { "name": "...", "address": "...", "tel": "...", "occupation": "..." } ],
                   "self_introduction": "...",
                   "recommender": { "name": null, "relationship": null, "position": null, "office": null } },
  "questionnaire": { "q1_gained_from_university": "...", "q2_proudest_achievement": "...",
                     "q3_failure_barrier": "...", "q4_strengths": "...", "q5_ideal_boss": "...",
                     "q6_weaknesses": "...", "q7_personal_goals": "...", "q8_preferred_job_type": "..." },
  "consents":    { "truth_certified_at": "2026-07-04T10:00:00Z",
                   "pdpa_general": true, "pdpa_general_at": "...",
                   "pdpa_sensitive": false, "pdpa_sensitive_at": "...",
                   "privacy_notice_acknowledged_at": "..." }
}
```

**หมายเหตุการ implement:**
- field หลักที่ query บ่อย (ชื่อ, email, เบอร์, ตำแหน่ง) ยังเป็น column ปกติใน `applications` — `form_data` เก็บส่วนที่เหลือ
- validate ด้วย **Zod schema** ฝั่ง client + Edge Function ฝั่ง server ให้ตรงกัน
- ฟอร์ม 7 step มี **save draft** (localStorage) กันข้อมูลหายระหว่างกรอก
- HR ดูใบสมัครในรูปแบบเดียวกับฟอร์มเดิม + ปุ่ม **Export PDF** ต่อใบสมัคร (สร้างจากข้อมูลในระบบ ไม่มีแบรนด์เดิม)
- Privacy Notice หน้า 8-13 ของฟอร์มเดิมผูกกับบริษัทเดิมทั้งฉบับ → ระบบมีหน้า `/privacy-notice` แยก แก้เนื้อหาได้จาก config/CMS ตาราง `site_settings`
