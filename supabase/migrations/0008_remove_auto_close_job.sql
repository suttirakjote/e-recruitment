-- ยกเลิกการปิดตำแหน่งอัตโนมัติเมื่อรับครบจำนวน — ให้ HR ปิดเองผ่านปุ่ม "ปิดรับสมัคร" เท่านั้น
drop trigger if exists trg_applications_autoclose on applications;
drop function if exists public.trg_auto_close_job();
