-- E-HR: การลงเวลาทำงาน (attendance)
create type attendance_status as enum ('present','late','leave','absent','holiday');

create table attendance_records (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  work_date   date not null default ((now() at time zone 'Asia/Bangkok')::date),
  clock_in    timestamptz,
  clock_out   timestamptz,
  status      attendance_status not null default 'present',
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index idx_attendance_emp on attendance_records(employee_id);
create index idx_attendance_date on attendance_records(work_date);

create trigger trg_attendance_updated before update on attendance_records
  for each row execute function set_updated_at();

alter table attendance_records enable row level security;

create policy "read attendance" on attendance_records for select
  using (is_hr() or employee_id = current_employee() or is_manager_of(employee_id));
create policy "hr write attendance" on attendance_records for all
  using (is_hr_writer()) with check (is_hr_writer());

create or replace function public.clock_in()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  emp uuid;
  local_now timestamp;
  rec attendance_records;
begin
  emp := current_employee();
  if emp is null then raise exception 'not an employee'; end if;
  local_now := (now() at time zone 'Asia/Bangkok');

  insert into attendance_records (employee_id, work_date, clock_in, status)
  values (emp, local_now::date, now(),
          (case when local_now::time > time '09:00' then 'late' else 'present' end)::attendance_status)
  on conflict (employee_id, work_date)
  do update set clock_in = coalesce(attendance_records.clock_in, excluded.clock_in),
                status = case when attendance_records.clock_in is null then excluded.status else attendance_records.status end
  returning * into rec;
  return to_jsonb(rec);
end;
$$;

create or replace function public.clock_out()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  emp uuid;
  rec attendance_records;
begin
  emp := current_employee();
  if emp is null then raise exception 'not an employee'; end if;

  update attendance_records set clock_out = now()
  where employee_id = emp and work_date = (now() at time zone 'Asia/Bangkok')::date
  returning * into rec;

  if rec.id is null then raise exception 'not_clocked_in'; end if;
  return to_jsonb(rec);
end;
$$;

revoke execute on function public.clock_in() from anon, public;
revoke execute on function public.clock_out() from anon, public;
grant execute on function public.clock_in() to authenticated;
grant execute on function public.clock_out() to authenticated;
