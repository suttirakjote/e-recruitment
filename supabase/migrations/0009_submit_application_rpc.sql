-- ผู้สมัคร (anon) ส่งใบสมัครผ่าน RPC นี้ แทนการ insert ตรง + select กลับ
-- (RLS ของ applications อ่านได้เฉพาะ HR ผู้สมัครจึงอ่าน id/tracking_code กลับไม่ได้)
-- SECURITY DEFINER: insert + คืนค่า โดย trigger ยังสร้าง tracking_code ที่ไม่ซ้ำให้
create or replace function public.submit_application(
  p_job_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_form_data jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_open boolean;
  v_id uuid;
  v_code text;
begin
  select exists(select 1 from jobs where id = p_job_id and status = 'open') into v_open;
  if not v_open then
    raise exception 'job_not_open';
  end if;

  insert into applications (job_id, first_name, last_name, email, phone, form_data, pdpa_consent)
  values (p_job_id, trim(p_first_name), trim(p_last_name), lower(trim(p_email)), trim(p_phone),
          coalesce(p_form_data, '{}'::jsonb), true)
  returning id, tracking_code into v_id, v_code;

  return jsonb_build_object('id', v_id, 'tracking_code', v_code);
exception
  when unique_violation then
    raise exception 'duplicate';
end;
$$;

revoke execute on function public.submit_application(uuid,text,text,text,text,jsonb) from public;
grant execute on function public.submit_application(uuid,text,text,text,text,jsonb) to anon, authenticated;
