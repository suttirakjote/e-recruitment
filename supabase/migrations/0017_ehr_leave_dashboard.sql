-- E-HR: ประเภทวันลา, วันหยุดบริษัท, รายการวันลา (นำเข้าภายหลัง) + Dashboard สรุป
create table leave_types (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  annual_quota_days numeric not null default 0,
  color             text,
  sort_order        int not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create table company_holidays (
  holiday_date date primary key,
  name         text not null,
  created_at   timestamptz not null default now()
);
create index idx_holidays_year on company_holidays((extract(year from holiday_date)));

create table leave_entries (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id),
  start_date    date not null,
  end_date      date not null,
  days          numeric not null default 1,
  note          text,
  source        text not null default 'manual',
  created_at    timestamptz not null default now()
);
create index idx_leave_entries_emp on leave_entries(employee_id);
create index idx_leave_entries_start on leave_entries(start_date);
create index idx_leave_entries_type on leave_entries(leave_type_id);

alter table leave_types enable row level security;
alter table company_holidays enable row level security;
alter table leave_entries enable row level security;

create policy "staff read leave_types" on leave_types for select
  using (is_hr() or current_employee() is not null);
create policy "admin write leave_types" on leave_types for all
  using (is_hr_admin()) with check (is_hr_admin());

create policy "staff read holidays" on company_holidays for select
  using (is_hr() or current_employee() is not null);
create policy "admin write holidays" on company_holidays for all
  using (is_hr_admin()) with check (is_hr_admin());

create policy "read leave_entries" on leave_entries for select
  using (is_hr() or employee_id = current_employee() or is_manager_of(employee_id));
create policy "hr write leave_entries" on leave_entries for all
  using (is_hr_writer()) with check (is_hr_writer());

insert into site_settings (key, value) values ('working_weekdays', '[1,2,3,4,5]')
on conflict (key) do nothing;
