-- รูปพนักงานภายใน (HR / ผู้อนุมัติ)
alter table profiles add column if not exists photo_path text;

-- bucket สาธารณะสำหรับรูปพนักงาน (path เป็น uuid เดาไม่ได้ + แสดงในพอร์ทัลภายในเท่านั้น)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "hr upload avatars" on storage.objects for insert
  with check (bucket_id = 'avatars' and public.is_hr());
create policy "hr update avatars" on storage.objects for update
  using (bucket_id = 'avatars' and public.is_hr());
create policy "hr delete avatars" on storage.objects for delete
  using (bucket_id = 'avatars' and public.is_hr());
create policy "public read avatars" on storage.objects for select
  using (bucket_id = 'avatars');

-- อนุญาตให้ผู้ใช้อัปเดตรูปของตัวเองได้ (เฉพาะ photo_path — ผ่าน RPC ที่คุมคอลัมน์)
create or replace function public.update_my_photo(p_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_active) then
    raise exception 'not an active hr user';
  end if;
  update profiles set photo_path = p_path where id = auth.uid();
end;
$$;
revoke execute on function public.update_my_photo(text) from anon, public;
grant execute on function public.update_my_photo(text) to authenticated;
