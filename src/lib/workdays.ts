export const MONTH_NAMES_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** จำนวนวันทำงานรายเดือน (index 0-11) และรวมทั้งปี = วันในสัปดาห์ที่ทำงาน ลบวันหยุดบริษัท */
export function computeWorkdays(
  year: number,
  workingWeekdays: number[],
  holidays: Set<string>
): { perMonth: number[]; total: number } {
  const wd = new Set(workingWeekdays);
  const perMonth = Array<number>(12).fill(0);
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, m, d).getDay(); // 0=อา .. 6=ส
      const iso = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (wd.has(dow) && !holidays.has(iso)) perMonth[m]++;
    }
  }
  return { perMonth, total: perMonth.reduce((a, b) => a + b, 0) };
}

export const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
