-- ตั้งค่า SMTP สำหรับส่งอีเมล (singleton 1 แถว)
-- เก็บ app password เป็นความลับ → RLS ไม่มี policy = เข้าถึงได้เฉพาะ service role
-- (แก้/อ่านผ่าน Edge Function email-config ที่เช็คสิทธิ์ admin เท่านั้น)
create table email_settings (
  id            int primary key default 1 check (id = 1),
  provider      text not null default 'gmail',
  smtp_host     text not null default 'smtp.gmail.com',
  smtp_port     int  not null default 465,
  smtp_user     text,                      -- อีเมลตัวกลาง (relay) เช่น hr@gmail.com
  smtp_password text,                       -- Gmail App Password (ความลับ)
  from_name     text not null default 'ฝ่ายทรัพยากรบุคคล',
  from_email    text,                       -- ค่าว่าง = ใช้ smtp_user
  enabled       boolean not null default false,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references profiles(id)
);

alter table email_settings enable row level security;
-- ไม่สร้าง policy ใดๆ → anon/authenticated เข้าไม่ได้ มีแต่ service role (bypass RLS)

insert into email_settings (id) values (1) on conflict do nothing;
