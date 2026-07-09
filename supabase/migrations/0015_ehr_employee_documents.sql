-- E-HR: เอกสารพนักงาน
create table employee_documents (
  id                  uuid primary key default gen_random_uuid(),
  employee_id         uuid not null references employees(id) on delete cascade,
  doc_type            text not null default 'other',
  title               text not null,
  storage_path        text not null,
  file_name           text not null,
  file_size           int,
  visible_to_employee boolean not null default true,
  uploaded_by         uuid references profiles(id),
  uploaded_at         timestamptz not null default now()
);
create index idx_empdocs_emp on employee_documents(employee_id);

alter table employee_documents enable row level security;

create policy "read employee_documents" on employee_documents for select
  using (
    is_hr()
    or (employee_id = current_employee() and visible_to_employee)
    or is_manager_of(employee_id)
  );
create policy "hr write employee_documents" on employee_documents for all
  using (is_hr_writer()) with check (is_hr_writer());

insert into storage.buckets (id, name, public) values ('employee-docs', 'employee-docs', false)
on conflict (id) do nothing;

create policy "hr upload employee-docs" on storage.objects for insert
  with check (bucket_id = 'employee-docs' and public.is_hr_writer());
create policy "hr delete employee-docs" on storage.objects for delete
  using (bucket_id = 'employee-docs' and public.is_hr_writer());
create policy "read employee-docs" on storage.objects for select
  using (
    bucket_id = 'employee-docs'
    and (public.is_hr() or (storage.foldername(name))[1] = public.current_employee()::text)
  );
