-- hr_admin ลบใบสมัครได้ (สำหรับนโยบายลบข้อมูลตาม PDPA) — FK cascade ลบไฟล์/ประวัติ/โน้ต/approval ให้เอง
create policy "admin delete applications" on applications for delete
  using (is_hr_admin());
