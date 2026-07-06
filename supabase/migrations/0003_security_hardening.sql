-- แก้คำเตือนจาก security advisors

alter function public.set_updated_at() set search_path = public;
alter function public.gen_tracking_code() set search_path = public;

revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.gen_tracking_code() from anon, authenticated, public;
revoke execute on function public.log_status_change() from anon, authenticated, public;
revoke execute on function public.validate_approval() from anon, authenticated, public;
revoke execute on function public.cascade_approval() from anon, authenticated, public;
revoke execute on function public.notify_edge(jsonb) from anon, authenticated, public;
revoke execute on function public.trg_notify_new_application() from anon, authenticated, public;
revoke execute on function public.trg_notify_approvals() from anon, authenticated, public;
revoke execute on function public.trg_notify_status() from anon, authenticated, public;
revoke execute on function public.trg_auto_close_job() from anon, authenticated, public;
revoke execute on function public.start_approval_process(uuid) from anon, public;

drop extension if exists pg_net;
create schema if not exists extensions;
create extension pg_net with schema extensions;

create or replace function public.application_exists(app_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from applications where id = app_id);
$$;

drop policy "anyone can attach files" on application_files;
create policy "attach files to real application" on application_files for insert
  with check (public.application_exists(application_id));
