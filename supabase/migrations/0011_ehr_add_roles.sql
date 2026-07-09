-- E-HR: เพิ่ม role พนักงาน/ผู้จัดการ (แยก migration เพราะใช้ค่า enum ใหม่ใน migration เดียวกันไม่ได้)
alter type hr_role add value if not exists 'manager';
alter type hr_role add value if not exists 'employee';
