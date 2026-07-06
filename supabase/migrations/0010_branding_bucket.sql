-- bucket สาธารณะสำหรับโลโก้บริษัท (แสดงบนหน้าเว็บสาธารณะ)
insert into storage.buckets (id, name, public) values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "hr upload branding" on storage.objects for insert
  with check (bucket_id = 'branding' and public.is_hr());
create policy "hr update branding" on storage.objects for update
  using (bucket_id = 'branding' and public.is_hr());
create policy "hr delete branding" on storage.objects for delete
  using (bucket_id = 'branding' and public.is_hr());
create policy "public read branding" on storage.objects for select
  using (bucket_id = 'branding');
