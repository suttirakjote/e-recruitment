-- E-HR Core: employees (master data), positions (org), employee_compensation (payroll-reserved)

create type employee_status as enum ('probation','active','on_leave','resigned','terminated');

create table positions (
  id            uuid primary key default gen_random_uuid(),
  code          text unique,
  title         text not null,
  department_id uuid references departments(id),
  created_at    timestamptz not null default now()
);

create table employees (
  id                uuid primary key default gen_random_uuid(),
  employee_code     text unique,
  prefix            text,
  first_name        text not null,
  last_name         text not null,
  first_name_en     text,
  last_name_en      text,
  nickname          text,
  department_id     uuid references departments(id),
  position_id       uuid references positions(id),
  position_title    text,
  manager_id        uuid references employees(id),
  employment_type   text not null default 'full_time',
  status            employee_status not null default 'active',
  hire_date         date,
  probation_end_date date,
  resign_date       date,
  email             text,
  phone             text,
  national_id       text,
  birth_date        date,
  gender            text,
  address           text,
  photo_path        text,
  application_id    uuid references applications(id),
  extra             jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_employees_dept on employees(department_id);
create index idx_employees_manager on employees(manager_id);
create index idx_employees_status on employees(status);
create index idx_employees_application on employees(application_id);

create trigger trg_employees_updated before update on employees
  for each row execute function set_updated_at();

create table employee_compensation (
  employee_id        uuid primary key references employees(id) on delete cascade,
  base_salary        numeric,
  bank_name          text,
  bank_account       text,
  social_security_no text,
  tax_id             text,
  updated_at         timestamptz not null default now(),
  updated_by         uuid references profiles(id)
);

alter table profiles add column if not exists employee_id uuid references employees(id);

create or replace function public.current_employee()
returns uuid language sql stable security definer set search_path = public as $$
  select employee_id from profiles where id = auth.uid() and is_active limit 1;
$$;

create or replace function public.is_manager_of(emp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees where id = emp and manager_id = public.current_employee());
$$;

revoke execute on function public.current_employee() from anon, public;
revoke execute on function public.is_manager_of(uuid) from anon, public;
grant execute on function public.current_employee() to authenticated;
grant execute on function public.is_manager_of(uuid) to authenticated;

alter table positions enable row level security;
alter table employees enable row level security;
alter table employee_compensation enable row level security;

create policy "staff read positions" on positions for select
  using (is_hr() or current_employee() is not null);
create policy "admin write positions" on positions for all
  using (is_hr_admin()) with check (is_hr_admin());

create policy "read employees" on employees for select
  using (is_hr() or id = current_employee() or is_manager_of(id));
create policy "hr write employees" on employees for all
  using (is_hr_writer()) with check (is_hr_writer());

create policy "admin read compensation" on employee_compensation for select
  using (is_hr_admin());
create policy "admin write compensation" on employee_compensation for all
  using (is_hr_admin()) with check (is_hr_admin());
