-- E-HR: is_hr() ต้องอิง "role ของ HR" จริง (ไม่ใช่แค่ active) เพราะตอนนี้พนักงาน ESS ก็มี profile
create or replace function public.is_hr()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active
      and role in ('hr_admin','hr_staff','approver','viewer')
  );
$$;

-- ทุกคนอ่าน profile ของตัวเองได้ (จำเป็นสำหรับ ESS ที่ role=employee)
create policy "read own profile" on profiles for select using (id = auth.uid());
