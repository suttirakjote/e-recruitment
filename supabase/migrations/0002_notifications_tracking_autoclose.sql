-- pg_net สำหรับเรียก edge function จาก trigger
create extension if not exists pg_net;

-- ===== TRACK APPLICATION (ผู้สมัครเช็คสถานะด้วย email + tracking code) =====
create or replace function public.track_application(p_email text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  app record;
  hist jsonb;
begin
  select a.id, a.tracking_code, a.status, a.submitted_at, a.first_name, j.title as job_title
    into app
  from applications a join jobs j on j.id = a.job_id
  where lower(a.email) = lower(trim(p_email))
    and a.tracking_code = upper(trim(p_code))
  limit 1;

  if app.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'to_status', h.to_status,
           'public_note', h.public_note,
           'created_at', h.created_at
         ) order by h.created_at), '[]'::jsonb)
    into hist
  from application_status_history h
  where h.application_id = app.id;

  return jsonb_build_object(
    'tracking_code', app.tracking_code,
    'job_title', app.job_title,
    'first_name', app.first_name,
    'status', app.status,
    'submitted_at', app.submitted_at,
    'history', hist
  );
end;
$$;
grant execute on function public.track_application(text, text) to anon, authenticated;

-- ===== NOTIFY EDGE FUNCTION =====
create or replace function public.notify_edge(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://ccngancgnxyyyvitinpc.supabase.co/functions/v1/notify',
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  null; -- อีเมลล้มเหลวต้องไม่ทำให้ transaction หลักพัง
end;
$$;

create or replace function public.trg_notify_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify_edge(jsonb_build_object('type', 'new_application', 'application_id', new.id));
  return new;
end;
$$;

create trigger trg_applications_notify after insert on applications
  for each row execute function trg_notify_new_application();

create or replace function public.trg_notify_approvals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.level = 1)
     or (tg_op = 'UPDATE' and old.decision is distinct from new.decision) then
    perform notify_edge(jsonb_build_object('type', 'approval_state', 'application_id', new.application_id));
  end if;
  return new;
end;
$$;

create trigger trg_approvals_notify after insert or update on application_approvals
  for each row execute function trg_notify_approvals();

create or replace function public.trg_notify_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status
     and new.status in ('interview_scheduled', 'offer_sent', 'hired', 'rejected') then
    perform notify_edge(jsonb_build_object('type', 'status_changed', 'application_id', new.id));
  end if;
  return new;
end;
$$;

create trigger trg_applications_notify_status after update on applications
  for each row execute function trg_notify_status();

-- ===== AUTO-CLOSE JOB เมื่อรับครบจำนวน =====
create or replace function public.trg_auto_close_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'hired' and old.status is distinct from new.status then
    if (select count(*) from applications where job_id = new.job_id and status = 'hired')
       >= (select openings from jobs where id = new.job_id) then
      update jobs set status = 'closed', closed_at = now()
      where id = new.job_id and status <> 'closed';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_applications_autoclose after update on applications
  for each row execute function trg_auto_close_job();
