-- E-Recruitment initial schema
-- ===== ENUMS =====
create type job_status as enum ('draft', 'open', 'on_hold', 'closed');

create type application_status as enum (
  'submitted', 'screening', 'shortlisted', 'interview_scheduled', 'interviewed',
  'pending_approval', 'approved', 'offer_sent', 'hired', 'rejected', 'withdrawn'
);

create type approval_decision as enum ('pending', 'approved', 'rejected');

create type hr_role as enum ('hr_admin', 'hr_staff', 'approver', 'viewer');

-- ===== TABLES =====
create table departments (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name_th     text not null,
  name_en     text,
  created_at  timestamptz not null default now()
);

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  role          hr_role not null default 'viewer',
  job_title     text,
  department_id uuid references departments(id),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table jobs (
  id              uuid primary key default gen_random_uuid(),
  department_id   uuid not null references departments(id),
  title           text not null,
  description     text,
  requirements    text,
  employment_type text not null default 'full_time',
  location        text,
  salary_range    text,
  openings        int not null default 1,
  status          job_status not null default 'draft',
  published_at    timestamptz,
  closed_at       timestamptz,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table job_recruiters (
  job_id     uuid not null references jobs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (job_id, profile_id)
);

create table applications (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id),
  tracking_code   text unique not null default '',
  first_name      text not null,
  last_name       text not null,
  email           text not null,
  phone           text not null,
  form_data       jsonb not null default '{}',
  status          application_status not null default 'submitted',
  pdpa_consent    boolean not null default false,
  pdpa_consent_at timestamptz,
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (job_id, email)
);

create table application_files (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  file_type      text not null default 'cv',
  storage_path   text not null,
  file_name      text not null,
  file_size      int,
  uploaded_at    timestamptz not null default now()
);

create table application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  from_status    application_status,
  to_status      application_status not null,
  changed_by     uuid references profiles(id),
  note           text,
  public_note    text,
  created_at     timestamptz not null default now()
);

create table application_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_id      uuid not null references profiles(id),
  body           text not null,
  created_at     timestamptz not null default now()
);

create table approval_flows (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name          text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create unique index one_active_flow_per_dept on approval_flows(department_id) where is_active;

create table approval_flow_steps (
  id           uuid primary key default gen_random_uuid(),
  flow_id      uuid not null references approval_flows(id) on delete cascade,
  level        int not null,
  step_title   text not null,
  approver_id  uuid not null references profiles(id),
  unique (flow_id, level)
);

create table application_approvals (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  level          int not null,
  step_title     text not null,
  approver_id    uuid not null references profiles(id),
  decision       approval_decision not null default 'pending',
  comment        text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (application_id, level)
);

create table email_logs (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  template    text not null,
  ref_id      uuid,
  status      text not null,
  error       text,
  created_at  timestamptz not null default now()
);

create table site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- ===== INDEXES =====
create index idx_applications_job on applications(job_id);
create index idx_applications_status on applications(status);
create index idx_applications_email on applications(email);
create index idx_history_application on application_status_history(application_id);
create index idx_notes_application on application_notes(application_id);
create index idx_approvals_application on application_approvals(application_id);
create index idx_approvals_approver on application_approvals(approver_id) where decision = 'pending';
create index idx_files_application on application_files(application_id);
create index idx_jobs_status on jobs(status);

-- ===== HELPER FUNCTIONS =====
create or replace function public.is_hr()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.is_hr_writer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active and role in ('hr_admin', 'hr_staff')
  );
$$;

create or replace function public.is_hr_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active and role = 'hr_admin'
  );
$$;

-- ===== TRIGGERS =====
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_jobs_updated before update on jobs
  for each row execute function set_updated_at();
create trigger trg_applications_updated before update on applications
  for each row execute function set_updated_at();

-- tracking code: APP-YYYY-XXXXXX
create or replace function public.gen_tracking_code()
returns trigger language plpgsql set search_path = public as $$
declare
  code text;
begin
  if new.tracking_code is null or new.tracking_code = '' then
    loop
      code := 'APP-' || to_char(now(), 'YYYY') || '-' ||
              upper(substr(replace(encode(gen_random_bytes(6), 'base64'), '/', 'A'), 1, 6));
      code := regexp_replace(code, '[^A-Z0-9-]', 'X', 'g');
      exit when not exists (select 1 from applications where tracking_code = code);
    end loop;
    new.tracking_code := code;
  end if;
  if new.pdpa_consent then
    new.pdpa_consent_at := coalesce(new.pdpa_consent_at, now());
  end if;
  return new;
end;
$$;

create trigger trg_applications_tracking before insert on applications
  for each row execute function gen_tracking_code();

-- status history: log initial submit + every status change
create or replace function public.log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, null);
  elsif old.status is distinct from new.status then
    insert into application_status_history (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_applications_history after insert or update on applications
  for each row execute function log_status_change();

-- ===== APPROVAL WORKFLOW =====
-- HR ส่งใบสมัครเข้าสาย approve: snapshot ขั้นตอนจาก flow ของแผนก
create or replace function public.start_approval_process(app_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  dept_id uuid;
  flow_record record;
  step_count int;
begin
  if not is_hr_writer() then
    raise exception 'permission denied';
  end if;

  select j.department_id into dept_id
  from applications a join jobs j on j.id = a.job_id
  where a.id = app_id;

  if dept_id is null then
    raise exception 'application not found';
  end if;

  if exists (select 1 from application_approvals where application_id = app_id) then
    raise exception 'approval process already started';
  end if;

  select * into flow_record from approval_flows
  where department_id = dept_id and is_active limit 1;

  if flow_record.id is null then
    raise exception 'no active approval flow for this department';
  end if;

  insert into application_approvals (application_id, level, step_title, approver_id)
  select app_id, level, step_title, approver_id
  from approval_flow_steps where flow_id = flow_record.id;

  get diagnostics step_count = row_count;
  if step_count = 0 then
    raise exception 'approval flow has no steps';
  end if;

  update applications set status = 'pending_approval' where id = app_id;
end;
$$;

-- บังคับอนุมัติตามลำดับ level + ตั้ง decided_at
create or replace function public.validate_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.decision <> 'pending' then
    raise exception 'this step has already been decided';
  end if;
  if new.decision = 'pending' then
    return new;
  end if;
  if exists (
    select 1 from application_approvals
    where application_id = new.application_id
      and level < new.level and decision <> 'approved'
  ) then
    raise exception 'previous approval levels are not completed yet';
  end if;
  new.decided_at := now();
  return new;
end;
$$;

create trigger trg_approvals_validate before update on application_approvals
  for each row execute function validate_approval();

-- cascade ผลการอนุมัติไปที่ใบสมัคร
create or replace function public.cascade_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.decision = 'rejected' then
    update applications set status = 'rejected' where id = new.application_id;
  elsif new.decision = 'approved' and not exists (
    select 1 from application_approvals
    where application_id = new.application_id and decision <> 'approved'
  ) then
    update applications set status = 'approved' where id = new.application_id;
  end if;
  return new;
end;
$$;

create trigger trg_approvals_cascade after update on application_approvals
  for each row execute function cascade_approval();

-- ===== RLS =====
alter table departments enable row level security;
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table job_recruiters enable row level security;
alter table applications enable row level security;
alter table application_files enable row level security;
alter table application_status_history enable row level security;
alter table application_notes enable row level security;
alter table approval_flows enable row level security;
alter table approval_flow_steps enable row level security;
alter table application_approvals enable row level security;
alter table email_logs enable row level security;
alter table site_settings enable row level security;

-- departments: ผู้สมัครเห็นได้ (ใช้แสดงหน้า jobs), admin จัดการ
create policy "public read departments" on departments for select using (true);
create policy "admin write departments" on departments for all
  using (is_hr_admin()) with check (is_hr_admin());

-- profiles: HR เห็นกันเอง (ใช้แสดงชื่อผู้อนุมัติ)
create policy "hr read profiles" on profiles for select using (is_hr());
create policy "admin write profiles" on profiles for all
  using (is_hr_admin()) with check (is_hr_admin());

-- jobs: public เห็นเฉพาะ open, HR เห็นหมด
create policy "public read open jobs" on jobs for select
  using (status = 'open' or is_hr());
create policy "hr write jobs" on jobs for all
  using (is_hr_writer()) with check (is_hr_writer());

-- job_recruiters
create policy "hr read job_recruiters" on job_recruiters for select using (is_hr());
create policy "hr write job_recruiters" on job_recruiters for all
  using (is_hr_writer()) with check (is_hr_writer());

-- applications: ใครก็ส่งได้ (ตำแหน่งต้อง open + ยินยอม PDPA), ห้าม select โดย anon
create policy "anyone can apply" on applications for insert
  with check (
    status = 'submitted' and pdpa_consent = true
    and exists (select 1 from jobs where id = job_id and status = 'open')
  );
create policy "hr read applications" on applications for select using (is_hr());
create policy "hr update applications" on applications for update
  using (is_hr_writer()) with check (is_hr_writer());

-- application_files: แนบไฟล์ได้ตอนสมัคร, HR อ่าน
create policy "anyone can attach files" on application_files for insert with check (true);
create policy "hr read files" on application_files for select using (is_hr());

-- history: HR อ่าน (ผู้สมัครดูผ่าน server ด้วย service role)
create policy "hr read history" on application_status_history for select using (is_hr());
create policy "hr write history" on application_status_history for insert
  with check (is_hr_writer());

-- notes
create policy "hr read notes" on application_notes for select using (is_hr());
create policy "hr write notes" on application_notes for insert
  with check (is_hr() and author_id = auth.uid());

-- approval flows: HR อ่าน, admin จัดการ
create policy "hr read flows" on approval_flows for select using (is_hr());
create policy "admin write flows" on approval_flows for all
  using (is_hr_admin()) with check (is_hr_admin());
create policy "hr read flow steps" on approval_flow_steps for select using (is_hr());
create policy "admin write flow steps" on approval_flow_steps for all
  using (is_hr_admin()) with check (is_hr_admin());

-- application approvals: HR อ่าน, approver แก้เฉพาะแถวตัวเอง
create policy "hr read approvals" on application_approvals for select using (is_hr());
create policy "approver decide own step" on application_approvals for update
  using (approver_id = auth.uid() and decision = 'pending')
  with check (approver_id = auth.uid());

-- email logs: HR อ่าน (เขียนโดย service role)
create policy "hr read email logs" on email_logs for select using (is_hr());

-- site_settings: public อ่านได้ (org name / privacy notice), admin แก้
create policy "public read settings" on site_settings for select using (true);
create policy "admin write settings" on site_settings for all
  using (is_hr_admin()) with check (is_hr_admin());

-- ===== STORAGE =====
insert into storage.buckets (id, name, public) values ('applications', 'applications', false)
on conflict (id) do nothing;

create policy "anyone can upload application files" on storage.objects for insert
  with check (bucket_id = 'applications');
create policy "hr can read application files" on storage.objects for select
  using (bucket_id = 'applications' and public.is_hr());

-- ===== SEED =====
insert into site_settings (key, value) values
  ('org_name', '"ชื่อองค์กรของคุณ"'),
  ('org_logo_path', 'null'),
  ('notify_applicant_on_status_change', 'false'),
  ('privacy_notice_html', '"<h2>ประกาศคุ้มครองข้อมูลส่วนบุคคลสำหรับผู้สมัครงาน</h2><p>(ข้อความตัวอย่าง — ผู้ดูแลระบบสามารถแก้ไขได้ที่เมนู Settings → Privacy Notice)</p><p>องค์กรมีความจำเป็นต้องเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่านเพื่อใช้ประกอบกระบวนการพิจารณาใบสมัครงาน เช่น การสรรหาบุคลากร การตรวจสอบ การพิจารณาคุณสมบัติและความเหมาะสมในตำแหน่งงานที่ท่านได้สมัครไว้ ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>"')
on conflict (key) do nothing;