-- เพิ่มพิกัด GPS + โหมดทำงาน (ในสถานที่/นอกสถานที่) ให้การลงเวลา
alter table attendance_records
  add column if not exists clock_in_lat  double precision,
  add column if not exists clock_in_lng  double precision,
  add column if not exists clock_out_lat double precision,
  add column if not exists clock_out_lng double precision,
  add column if not exists work_mode     text not null default 'office';

drop function if exists public.clock_in();
drop function if exists public.clock_out();

create or replace function public.clock_in(
  p_lat  double precision default null,
  p_lng  double precision default null,
  p_mode text default 'office'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  emp uuid;
  local_now timestamp;
  rec attendance_records;
begin
  emp := current_employee();
  if emp is null then raise exception 'not an employee'; end if;
  local_now := (now() at time zone 'Asia/Bangkok');

  insert into attendance_records (employee_id, work_date, clock_in, status, clock_in_lat, clock_in_lng, work_mode)
  values (emp, local_now::date, now(),
          (case when local_now::time > time '09:00' then 'late' else 'present' end)::attendance_status,
          p_lat, p_lng, coalesce(p_mode, 'office'))
  on conflict (employee_id, work_date)
  do update set
    clock_in     = coalesce(attendance_records.clock_in, excluded.clock_in),
    status       = case when attendance_records.clock_in is null then excluded.status       else attendance_records.status       end,
    clock_in_lat = case when attendance_records.clock_in is null then excluded.clock_in_lat else attendance_records.clock_in_lat end,
    clock_in_lng = case when attendance_records.clock_in is null then excluded.clock_in_lng else attendance_records.clock_in_lng end,
    work_mode    = case when attendance_records.clock_in is null then excluded.work_mode    else attendance_records.work_mode    end
  returning * into rec;
  return to_jsonb(rec);
end;
$$;

create or replace function public.clock_out(
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  emp uuid;
  rec attendance_records;
begin
  emp := current_employee();
  if emp is null then raise exception 'not an employee'; end if;

  update attendance_records
     set clock_out = now(), clock_out_lat = p_lat, clock_out_lng = p_lng
   where employee_id = emp and work_date = (now() at time zone 'Asia/Bangkok')::date
  returning * into rec;

  if rec.id is null then raise exception 'not_clocked_in'; end if;
  return to_jsonb(rec);
end;
$$;

revoke execute on function public.clock_in(double precision, double precision, text) from anon, public;
revoke execute on function public.clock_out(double precision, double precision) from anon, public;
grant execute on function public.clock_in(double precision, double precision, text) to authenticated;
grant execute on function public.clock_out(double precision, double precision) to authenticated;
