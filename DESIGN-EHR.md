# E-HR System — Design & Architecture (ยกระดับจาก E-Recruitment)

> เอกสารนี้ออกแบบการขยายระบบ **E-Recruitment** ปัจจุบัน ให้กลายเป็น **E-HR** (ระบบ HR ครบวงจร)
> โดย **Recruitment กลายเป็น 1 โมดูล** ในระบบใหญ่ — เขียนไว้ให้ตรวจสอบก่อนเริ่มพัฒนา
> สถานะ: **ร่างเพื่อรีวิว — ยังไม่เริ่มพัฒนา**

---

## 1. ภาพรวมและวิสัยทัศน์

เปลี่ยนจาก "ระบบรับสมัครงาน" → "**ระบบบริหารทรัพยากรบุคคล**" ที่รวมงาน HR หลักไว้ในที่เดียว
มีผู้ใช้ 3 กลุ่ม (เดิมมีแค่ 2):

| กลุ่มผู้ใช้ | เดิม (E-Recruitment) | ใหม่ (E-HR) |
|---|---|---|
| ผู้สมัครงาน (ภายนอก) | ✅ มี | ✅ คงเดิม (Careers site) |
| HR / ผู้ดูแล | ✅ มี | ✅ ขยายเป็น "HR Workspace" หลายโมดูล |
| **พนักงานภายใน** | ❌ ไม่มี | 🆕 **Employee Self-Service (ESS)** — พนักงานล็อกอินดูข้อมูลตัวเอง ลางาน ฯลฯ |
| **หัวหน้างาน/ผู้จัดการ** | ❌ (มีแค่ "approver") | 🆕 อนุมัติคำขอของลูกทีม ดูข้อมูลทีม |

**หัวใจของการเปลี่ยน:** เพิ่ม **"พนักงาน (Employee)" เป็นข้อมูลหลัก (master data)** ของทั้งระบบ —
ทุกโมดูล (ลางาน, เวลาทำงาน, ประเมินผล) อ้างอิงพนักงานคนเดียวกัน และผู้สมัครที่ผ่านการรับเข้า
จะถูก **แปลงเป็นพนักงาน** อัตโนมัติ (เชื่อม Recruitment → HR)

---

## 2. โมดูลทั้งหมด (แบ่งเป็นเฟส)

| # | โมดูล | สถานะ | เฟส |
|---|---|---|---|
| 0 | **Core: Employee Directory + Org Structure + RBAC** | 🆕 ต้องทำก่อน | **1** |
| 1 | **Recruitment** (ที่มีอยู่) → ย้ายเป็นโมดูล + เชื่อม onboarding | ♻️ ปรับ | **1** |
| 2 | **Leave Management** (ลางาน + วันลาคงเหลือ + อนุมัติ) | 🆕 | **2** |
| 3 | **Attendance & Time** (ลงเวลา เข้า-ออก, กะ) | 🆕 | **3** |
| 4 | **Onboarding / Offboarding** (เช็คลิสต์รับเข้า-ลาออก) | 🆕 | **3** |
| 5 | **Performance** (ประเมินผล, KPI, รอบประเมิน) | 🆕 | **4** |
| 6 | **Training & Development** (หลักสูตร, ลงทะเบียน, ประวัติอบรม) | 🆕 | **4** |
| 7 | **Documents** (สัญญา, เอกสารพนักงาน, หนังสือรับรอง) | 🆕 | **4** |
| 8 | **Announcements / HR Requests** (ประกาศ, คำร้องทั่วไป) | 🆕 | **4** |
| 9 | **Payroll** (เงินเดือน, สลิป) | ⚠️ ซับซ้อน/กฎหมาย | **5 หรือแยกภายหลัง** |

> **คำแนะนำ:** เริ่ม **เฟส 1 (Core + ย้าย Recruitment)** ให้เสร็จก่อน เพราะเป็นฐานที่ทุกโมดูลต้องพึ่ง
> จากนั้นทำ **Leave** เป็นโมดูลแรกที่พนักงานได้ใช้จริง (เห็นผลเร็ว, ใช้ ESS + สายอนุมัติ)
> **Payroll แนะนำให้ไว้ท้ายสุดหรือแยกระบบ** เพราะเกี่ยวกับภาษี/ประกันสังคม/กฎหมายแรงงาน ความเสี่ยงสูง

---

## 3. การตัดสินใจเชิงสถาปัตยกรรมหลัก (พร้อมคำแนะนำ)

### 3.1 โมเดล Identity — เรื่องสำคัญที่สุด 🔑

**ปัญหา:** ปัจจุบัน `profiles` = "บัญชีผู้ใช้ HR ที่ล็อกอินได้" เท่านั้น (hr_admin/hr_staff/approver/viewer)
ไม่มีแนวคิด "พนักงานทั้งองค์กร" และผู้สมัครก็ไม่มี account

**คำแนะนำ (แนวทางเสี่ยงต่ำ แบบค่อยเป็นค่อยไป):**

```
employees  (ข้อมูลพนักงานทุกคน — master data)
  ├─ id, employee_code, ชื่อ-นามสกุล (th/en), แผนก, ตำแหน่ง
  ├─ manager_id ──┐ (อ้างอิงตัวเอง = โครงสร้างองค์กร / สายบังคับบัญชา)
  ├─ hire_date, employment_type, status (active/probation/on_leave/resigned)
  ├─ ข้อมูลส่วนตัว (เกิด, บัตร ปชช, ที่อยู่ ...) — ย้ายจาก form_data ของผู้สมัครที่ถูกรับเข้า
  └─ user_id ──→ auth.users (nullable) ← มีค่าเฉพาะคนที่ "ล็อกอินได้"

profiles (คงไว้เป็น "บัญชีล็อกอิน" + role ของระบบ)
  └─ เพิ่มคอลัมน์ employee_id ──→ employees (เชื่อม 1:1)
```

- **พนักงานทุกคน = 1 แถวใน `employees`** (แม้ไม่มีสิทธิ์ล็อกอิน)
- **คนที่ล็อกอินได้** (HR, ผู้จัดการ, พนักงานที่เปิด ESS) = มี `auth.users` + `profiles` ที่ผูกกับ employee
- ข้อดี: **Recruitment เดิมทำงานต่อได้เลย** ไม่ต้องรื้อ `profiles` — แค่เพิ่ม `employees` แล้วเชื่อม
- เมื่อผู้สมัคร "ถูกจ้าง (hired)" → สร้างแถวใน `employees` จากข้อมูลใบสมัคร (สะพาน Recruitment→HR)

> **ทางเลือกอื่น (เสี่ยงสูงกว่า):** ยุบ `profiles` รวมเข้า `employees` เลย — สะอาดกว่าระยะยาว
> แต่ต้องแก้ FK ที่ชี้ profiles ทั้งหมด (job_recruiters, application_approvals, application_notes,
> ฟังก์ชัน is_hr/is_hr_admin ฯลฯ) → กระทบเยอะ **ผมแนะนำแนวทางเสี่ยงต่ำข้างบนก่อน**

### 3.2 Recruitment กลายเป็นโมดูล

- ย้าย route `/hr/jobs`, `/hr/applications`, `/hr/approvals`, `/hr/approval-process`
  → ไว้ใต้ **`/hr/recruitment/*`**
- Careers site ฝั่งผู้สมัคร (`(public)/jobs`, `/apply`, `/track`) **คงเดิม** ไม่ย้าย
- `application_approvals.approver_id` (ชี้ profiles) — คงเดิมในเฟส 1, ค่อยพิจารณาผูกกับ employees ทีหลัง
- **จุดเชื่อมใหม่:** ปุ่ม "รับเข้าทำงาน (hired)" → สร้าง `employee` + เริ่ม onboarding checklist

### 3.3 App Shell / Navigation / Self-Service

โครงหน้าจอใหม่แบ่งเป็น 3 โซน:

| โซน | Route | ใคร | เนื้อหา |
|---|---|---|---|
| Careers (สาธารณะ) | `/`, `/jobs`, `/apply`, `/track` | ผู้สมัคร | คงเดิม |
| **HR Workspace** | `/hr/*` | HR / ผู้จัดการ | แดชบอร์ดรวม + โมดูลทั้งหมด (sidebar แบ่งกลุ่มโมดูล) |
| **Employee Self-Service** | `/me/*` | พนักงานทุกคน | ข้อมูลฉัน, วันลาคงเหลือ, ยื่นลา, สลิป, คำขอของฉัน |

- Sidebar ของ HR Workspace เปลี่ยนเป็นแบบ **จัดกลุ่มตามโมดูล** + แสดงเมนูตามสิทธิ์
- ผู้จัดการเห็นเมนู "ทีมของฉัน" (อนุมัติคำขอลูกทีม)

### 3.4 RBAC / ระบบสิทธิ์

ขยาย role เดิม (hr_admin/hr_staff/approver/viewer) เป็น:

| Role | ขอบเขต |
|---|---|
| `hr_admin` | จัดการทั้งระบบ + ตั้งค่า |
| `hr_staff` | ทำงาน HR ทุกโมดูล (ไม่รวมตั้งค่าระบบ) |
| `manager` | เห็น/อนุมัติเฉพาะลูกทีม (อิงจาก `manager_id`) |
| `employee` | ESS ของตัวเองเท่านั้น |
| `viewer` | ดูอย่างเดียว |

- สิทธิ์ "ผู้จัดการ" ได้จาก **โครงสร้างองค์กร** (เป็น manager_id ของใคร) ไม่ใช่ role แบนๆ
- RLS ยังเป็นชั้นบังคับหลัก + เพิ่ม helper เช่น `is_manager_of(emp)`, `current_employee()`

### 3.5 Approval Engine กลาง (ใช้ซ้ำได้ทุกโมดูล)

**ปัญหา:** ตอนนี้ระบบอนุมัติผูกกับ Recruitment โดยเฉพาะ (`approval_flows`, `application_approvals`)
แต่ Leave, การเบิก, ฯลฯ ก็ต้องมีสายอนุมัติ

**คำแนะนำ:** สร้าง **generic approval engine** ที่ใช้ซ้ำได้:

```
approval_requests (คำขอที่ต้องอนุมัติ — ทุกประเภท)
  ├─ module ('leave' | 'recruitment' | 'expense' ...)
  ├─ ref_id (ชี้ไปที่ record ต้นทาง เช่น leave_request.id)
  ├─ requester_employee_id, status
approval_request_steps (ขั้นตอนของแต่ละคำขอ — snapshot)
  ├─ level, approver_employee_id, decision, decided_at, comment
```

- Leave ใช้ engine นี้ตั้งแต่แรก
- Recruitment เดิม **ยังใช้ระบบเก่าไปก่อน** (ไม่รื้อของที่ทำงานอยู่) แล้วค่อย migrate มาใช้ engine กลางภายหลัง
- สายอนุมัติ default ของ Leave = ตาม **โครงสร้างองค์กร** (หัวหน้าตรง → HR) หรือกำหนดเองต่อแผนก

---

## 4. โครงสร้างโฟลเดอร์/Route (ก่อน → หลัง)

```
src/app/
  (public)/                    # คงเดิม — Careers site
    page, jobs, jobs/[id], jobs/[id]/apply, apply/success, track, privacy-notice

  hr/
    login/                     # คงเดิม
    (portal)/
      layout.tsx               # ♻️ sidebar แบบจัดกลุ่มโมดูล + ตามสิทธิ์
      page.tsx                 # ♻️ แดชบอร์ดรวมข้ามโมดูล
      employees/               # 🆕 โมดูล Employee Directory
        page, [id], new, [id]/edit, org-chart
      recruitment/             # ♻️ ย้ายของเดิมมาไว้ที่นี่
        page, jobs/*, applications/*, approvals, approval-process
      leave/                   # 🆕 (เฟส 2) จัดการวันลา, อนุมัติ, ประเภทลา
      attendance/              # 🆕 (เฟส 3)
      performance/             # 🆕 (เฟส 4)
      settings/                # ♻️ ขยาย: users, departments, positions, leave-types,
                               #     approval-flows, email, branding, privacy-notice
  me/                          # 🆕 Employee Self-Service
    layout, page (โปรไฟล์ฉัน), leave (ยื่นลา/ดูคงเหลือ), documents, requests

src/components/
  hr/            # เดิม + เพิ่มต่อโมดูล (employees/, leave/ ...)
  ess/           # 🆕 คอมโพเนนต์ฝั่งพนักงาน
  ui.tsx         # คงเดิม (ใช้ร่วม)

supabase/migrations/   # เพิ่ม 0011+ ต่อโมดูล
```

---

## 5. Schema ที่เพิ่ม (ระดับสูง — รายละเอียดเต็มตอนลงมือแต่ละเฟส)

**เฟส 1 — Core**
- `employees` (master data พนักงาน + manager_id + user_id)
- `positions` (ตำแหน่งงานมาตรฐานในองค์กร — ต่างจาก "jobs" ที่เปิดรับสมัคร)
- ปรับ `profiles`: + `employee_id`, ขยาย enum role (+manager, +employee)
- เพิ่ม helper RLS: `current_employee()`, `is_manager_of()`
- แก้ trigger ตอน hired → สร้าง employee

**เฟส 2 — Leave**
- `leave_types` (ลาป่วย/ลากิจ/ลาพักร้อน + สิทธิ์ต่อปี + ตั้งค่าได้)
- `leave_balances` (คงเหลือต่อพนักงานต่อปีต่อประเภท)
- `leave_requests` (คำขอลา + ช่วงวัน + จำนวนวัน + สถานะ) → ผูก approval engine
- `approval_requests` + `approval_request_steps` (engine กลาง)

**เฟส 3 — Attendance/Onboarding**
- `work_schedules`, `attendance_records`, `onboarding_checklists`, `onboarding_tasks`

**เฟส 4 — อื่นๆ**
- `performance_cycles`, `performance_reviews`, `training_courses`, `training_records`,
  `employee_documents`, `announcements`

> Storage เพิ่ม bucket: `employee-docs` (private), ใช้ `avatars`/`branding` เดิมต่อ

---

## 6. ผลกระทบต่อโค้ด/ข้อมูลเดิม + ความเสี่ยง

| รายการ | ผลกระทบ | ความเสี่ยง |
|---|---|---|
| ตาราง `profiles` | เพิ่มคอลัมน์ + ขยาย enum role (ไม่ลบของเดิม) | 🟢 ต่ำ |
| Route recruitment ย้ายไป `/hr/recruitment/*` | URL เปลี่ยน (ภายใน HR เท่านั้น) | 🟢 ต่ำ — แก้ลิงก์ในโค้ด + redirect เก่า |
| `layout.tsx` (sidebar) | รื้อเป็นแบบโมดูล | 🟡 กลาง — กระทบทุกหน้า HR |
| ระบบอนุมัติ | เพิ่ม engine ใหม่ (ของเก่าคงไว้) | 🟢 ต่ำ — ไม่แตะ recruitment เดิม |
| RLS / helper functions | เพิ่มใหม่ (ไม่แก้ของเดิม) | 🟢 ต่ำ |
| Careers site (public) | ไม่แตะ | 🟢 ไม่กระทบ |
| Edge functions / email | `notify` ขยายให้รองรับ event ใหม่ (ลาอนุมัติ ฯลฯ) | 🟡 กลาง |
| ข้อมูลใน production | เพิ่มตารางใหม่ ไม่ลบข้อมูลเดิม | 🟢 ต่ำ |

**หลักการลดความเสี่ยง:** *เพิ่ม (additive) มากกว่ารื้อ* — ของที่ทำงานอยู่ (recruitment, careers, email, branding)
คงไว้ทำงานต่อ, สร้างโมดูลใหม่ข้างๆ, แล้วค่อย migrate จุดเชื่อมทีละส่วน

---

## 7. แผนการพัฒนา (Build Order) — ปรับตามการตัดสินใจแล้ว

| เฟส | ขอบเขต | ผลลัพธ์ |
|---|---|---|
| **1A** | สร้าง `employees` + org structure (positions, manager) + ปรับ profiles/RBAC (+role manager, employee) | มีข้อมูลพนักงานเป็นฐาน |
| **1B** | รื้อ app shell (sidebar แบบโมดูล) + ย้าย recruitment → `/hr/recruitment/*` | โครง E-HR + recruitment ทำงานเหมือนเดิม |
| **1C** | Employee Directory UI (ดู/เพิ่ม/แก้พนักงาน + org chart) + จุดเชื่อม hired→employee | HR จัดการพนักงานได้ |
| **1D** | **ESS** (`/me`) — พนักงานล็อกอิน + ดูข้อมูลตัวเอง (ยังไม่มีการลา) | พนักงานเข้าระบบเห็นข้อมูลตัวเองได้ |
| — | **⏸️ หยุดให้คุณรีวิวก่อนไปต่อ** | |
| **2** | **Attendance** (ลงเวลา) + **Documents** (เอกสารพนักงาน) | โมดูลที่เลือกไว้ |
| **ภายหลัง** | Leave (ตอนนี้ใช้ระบบเดิม — สั่งเพิ่มทีหลัง), Onboarding, Performance, Training, Announcements | ตามสั่ง |
| **ในแผน** | **Payroll** — ออกแบบข้อมูลเงินเดือนใน `employees` เผื่อไว้ แต่ยังไม่สร้างโมดูล | รอทำ |

> จบแต่ละเฟสค่อยตรวจ/ทดสอบก่อนไปต่อ — พัฒนาบน local ทั้งหมด, push git ทีเดียวเมื่อคุณพอใจ

---

## 8. สรุปการตัดสินใจ (ล็อกแล้ว — สำหรับพัฒนา)

| เรื่อง | ข้อสรุป |
|---|---|
| ขอบเขตเฟสแรก | **Core + ย้าย Recruitment** (เฟส 1A–1D) แล้วหยุดให้รีวิว |
| ESS (พนักงานล็อกอิน) | ✅ **เปิดในเฟส 1** — พนักงานล็อกอินดูข้อมูลตัวเองได้ **แต่ยังไม่ทำส่วนการลา** (ลายังใช้ระบบเดิม สั่งเพิ่มทีหลัง) |
| โมดูลถัดไปหลัง Core | **Attendance (ลงเวลา)** + **Documents (เอกสารพนักงาน)** |
| Payroll | ✅ **อยู่ในแผน** — ออกแบบฟิลด์เงินเดือน/ค่าตอบแทนใน `employees` เผื่อไว้ ยังไม่สร้างโมดูลตอนนี้ |
| โมเดล Identity | ✅ **เพิ่ม `employees` ข้าง `profiles`** (เสี่ยงต่ำ) — `profiles` = บัญชีล็อกอินทั้งหมด (HR + พนักงาน ESS), `employees` = ข้อมูลพนักงานทุกคน เชื่อม 1:1 |

**ผลของ "เปิด ESS" ต่อโมเดล Identity:**
- พนักงานที่ล็อกอิน = มี `auth.users` + `profiles(role='employee', employee_id→employees)`
- `/hr/*` เข้าได้เฉพาะ role HR (is_hr) — พนักงานทั่วไปเข้าไม่ได้ (helper เดิมยังใช้ได้ ไม่ต้องแก้)
- `/me/*` เข้าได้ทุก account ที่ active
- **เรื่องต้องตัดสินตอนสร้างเฟส 1D:** วิธีสร้าง account พนักงานจำนวนมาก — HR สร้างทีละคน / นำเข้าเป็นชุด (CSV) / ส่งลิงก์เชิญตั้งรหัสผ่านทางอีเมล (ค่อยเลือกตอนลงมือ)

**ผลของ "Payroll อยู่ในแผน" ต่อ `employees` (ออกแบบเผื่อ ไม่สร้างตอนนี้):**
- เก็บฟิลด์พื้นฐานเผื่อ: เงินเดือนฐาน, ประเภทการจ้าง, บัญชีธนาคาร, เลขประกันสังคม, เลขผู้เสียภาษี
  (เก็บแบบเข้ารหัส/จำกัดสิทธิ์เข้มงวด) — เพื่อไม่ต้อง migrate ใหญ่ตอนทำ Payroll จริง
