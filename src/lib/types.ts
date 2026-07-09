import type { ApplicationStatus, EmployeeStatus, JobStatus } from "./status";

export interface Department {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
}

export interface Position {
  id: string;
  code: string | null;
  title: string;
  department_id: string | null;
}

export interface Employee {
  id: string;
  employee_code: string | null;
  prefix: string | null;
  first_name: string;
  last_name: string;
  first_name_en: string | null;
  last_name_en: string | null;
  nickname: string | null;
  department_id: string | null;
  position_id: string | null;
  position_title: string | null;
  manager_id: string | null;
  employment_type: string;
  status: EmployeeStatus;
  hire_date: string | null;
  probation_end_date: string | null;
  resign_date: string | null;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  photo_path: string | null;
  application_id: string | null;
  departments?: { name_th: string } | null;
  manager?: { first_name: string; last_name: string } | null;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: "hr_admin" | "hr_staff" | "approver" | "viewer" | "manager" | "employee";
  job_title: string | null;
  department_id: string | null;
  is_active: boolean;
  photo_path: string | null;
  employee_id: string | null;
}

export interface Job {
  id: string;
  department_id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  employment_type: string;
  location: string | null;
  salary_range: string | null;
  openings: number;
  status: JobStatus;
  published_at: string | null;
  created_at: string;
  departments?: Department;
}

export interface Application {
  id: string;
  job_id: string;
  tracking_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  form_data: Record<string, unknown>;
  status: ApplicationStatus;
  pdpa_consent: boolean;
  submitted_at: string;
  jobs?: Job;
}

export interface ApplicationFile {
  id: string;
  application_id: string;
  file_type: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
}

export interface StatusHistory {
  id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_by: string | null;
  note: string | null;
  public_note: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface ApprovalStep {
  id: string;
  application_id: string;
  level: number;
  step_title: string;
  approver_id: string;
  decision: "pending" | "approved" | "rejected";
  comment: string | null;
  decided_at: string | null;
  profiles?: { full_name: string; email: string; photo_path: string | null } | null;
}
