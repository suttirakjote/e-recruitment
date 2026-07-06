-- fix: gen_random_bytes อยู่ใน schema extensions ซึ่ง search_path = public มองไม่เห็น
-- เปลี่ยนไปใช้ md5(random()) ที่เป็น built-in แทน
create or replace function public.gen_tracking_code()
returns trigger language plpgsql set search_path = public as $$
declare
  code text;
begin
  if new.tracking_code is null or new.tracking_code = '' then
    loop
      code := 'APP-' || to_char(now(), 'YYYY') || '-' ||
              upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when not exists (select 1 from applications where tracking_code = code);
    end loop;
    new.tracking_code := code;
  end if;
  if new.pdpa_consent then
    new.pdpa_consent_at := coalesce(new.pdpa_consent_at, now());
  end if;
  return new;
end;
$$;
