export type ApplicationStatus =
  | "submitted"
  | "screening"
  | "shortlisted"
  | "interview_scheduled"
  | "interviewed"
  | "pending_approval"
  | "approved"
  | "offer_sent"
  | "hired"
  | "rejected"
  | "withdrawn";

export type JobStatus = "draft" | "open" | "on_hold" | "closed";

export type EmployeeStatus =
  | "probation"
  | "active"
  | "on_leave"
  | "resigned"
  | "terminated";

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  probation: "ทดลองงาน",
  active: "ทำงานปกติ",
  on_leave: "ลาพัก",
  resigned: "ลาออกแล้ว",
  terminated: "พ้นสภาพ",
};

export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  probation: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  on_leave: "bg-sky-100 text-sky-800",
  resigned: "bg-stone-200 text-stone-600",
  terminated: "bg-rose-100 text-rose-800",
};

export const EMPLOYEE_STATUS_ORDER: EmployeeStatus[] = [
  "probation",
  "active",
  "on_leave",
  "resigned",
  "terminated",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "ส่งใบสมัครแล้ว",
  screening: "กำลังคัดกรอง",
  shortlisted: "ผ่านการคัดกรอง",
  interview_scheduled: "นัดสัมภาษณ์แล้ว",
  interviewed: "สัมภาษณ์เสร็จสิ้น",
  pending_approval: "รออนุมัติรับเข้าทำงาน",
  approved: "อนุมัติแล้ว",
  offer_sent: "ส่งข้อเสนอแล้ว",
  hired: "รับเข้าทำงาน",
  rejected: "ไม่ผ่านการพิจารณา",
  withdrawn: "ถอนใบสมัคร",
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  submitted: "bg-sky-100 text-sky-800",
  screening: "bg-blue-100 text-blue-800",
  shortlisted: "bg-indigo-100 text-indigo-800",
  interview_scheduled: "bg-violet-100 text-violet-800",
  interviewed: "bg-purple-100 text-purple-800",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-lime-100 text-lime-800",
  offer_sent: "bg-teal-100 text-teal-800",
  hired: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  withdrawn: "bg-stone-200 text-stone-600",
};

/** ลำดับสถานะปกติของกระบวนการ (ใช้เรียง dropdown ฝั่ง HR) */
export const STATUS_ORDER: ApplicationStatus[] = [
  "submitted",
  "screening",
  "shortlisted",
  "interview_scheduled",
  "interviewed",
  "pending_approval",
  "approved",
  "offer_sent",
  "hired",
  "rejected",
  "withdrawn",
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "ฉบับร่าง",
  open: "เปิดรับสมัคร",
  on_hold: "พักชั่วคราว",
  closed: "ปิดรับสมัคร",
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft: "bg-stone-200 text-stone-600",
  open: "bg-emerald-100 text-emerald-800",
  on_hold: "bg-amber-100 text-amber-800",
  closed: "bg-rose-100 text-rose-800",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "พนักงานประจำ",
  part_time: "พาร์ทไทม์",
  contract: "สัญญาจ้าง",
  intern: "ฝึกงาน",
};

export const HR_ROLE_LABELS: Record<string, string> = {
  hr_admin: "ผู้ดูแลระบบ",
  hr_staff: "เจ้าหน้าที่ HR",
  approver: "ผู้อนุมัติ",
  viewer: "ผู้ดูข้อมูล",
  manager: "หัวหน้างาน",
  employee: "พนักงาน",
};

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export type AttendanceStatus = "present" | "late" | "leave" | "absent" | "holiday";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "มาปกติ",
  late: "มาสาย",
  leave: "ลา",
  absent: "ขาดงาน",
  holiday: "วันหยุด",
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-800",
  late: "bg-amber-100 text-amber-800",
  leave: "bg-sky-100 text-sky-800",
  absent: "bg-rose-100 text-rose-800",
  holiday: "bg-stone-200 text-stone-600",
};
