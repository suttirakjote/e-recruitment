/* แสดงข้อมูล form_data ของใบสมัครในรูปแบบอ่านง่ายสำหรับ HR */

type Dict = Record<string, unknown>;

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Dict)[key];
  }
  return cur;
}

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return String(value);
}

function Item({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="text-sm text-stone-800">{text(value)}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-stone-100 pt-4 first:border-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold text-emerald-800">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-3">{children}</dl>;
}

const MARITAL: Dict = {
  single: "โสด", married: "แต่งงาน", married_unregistered: "แต่งงานไม่จดทะเบียน",
  widowed: "หม้าย", divorced: "หย่า", separated: "แยกกันอยู่",
};
const RESIDENCE: Dict = {
  parents: "อยู่กับบิดามารดา", own: "บ้านของตนเอง", rented: "หอพัก/บ้านเช่า", other: "อื่นๆ",
};
const MILITARY: Dict = {
  completed: "ผ่านการเกณฑ์ทหารแล้ว", exempted: "ได้รับการยกเว้น", other: "อื่นๆ",
};
const RELATION: Dict = {
  father: "บิดา", mother: "มารดา", spouse: "คู่สมรส",
  elder_sibling: "พี่", younger_sibling: "น้อง",
};
const LANG_LEVEL: Dict = { excellent: "ดีมาก", good: "ดี", fair: "พอใช้" };
const EMP_TYPE: Dict = { full_time: "ประจำ", contract: "ชั่วคราว/สัญญาจ้าง", internship: "ฝึกงาน" };

const QUESTIONS: [string, string][] = [
  ["q1_gained_from_university", "1) สิ่งที่ได้จากสถาบันการศึกษาที่เป็นประโยชน์ต่อการทำงาน"],
  ["q2_proudest_achievement", "2) ความสำเร็จที่ภูมิใจสูงสุด"],
  ["q3_failure_barrier", "3) ความล้มเหลว / อุปสรรคที่ผ่านมา"],
  ["q4_strengths", "4) คุณสมบัติเด่น"],
  ["q5_ideal_boss", "5) ผู้บังคับบัญชาในแบบที่ชอบ"],
  ["q6_weaknesses", "6) จุดอ่อนที่ต้องปรับปรุง"],
  ["q7_personal_goals", "7) เป้าหมายในชีวิต"],
  ["q8_preferred_job_type", "8) ลักษณะงานที่ชอบ"],
];

export function FormDataView({ data }: { data: Dict }) {
  const family = (get(data, "family.members") as Dict[] | null) ?? [];
  const education = (get(data, "education.records") as Dict[] | null) ?? [];
  const trainings = (get(data, "education.trainings") as Dict[] | null) ?? [];
  const languages = (get(data, "skills.languages") as Dict[] | null) ?? [];
  const experiences = (get(data, "experience.records") as Dict[] | null) ?? [];
  const references = (get(data, "further.references") as Dict[] | null) ?? [];

  return (
    <div className="space-y-5">
      <Section title="ข้อมูลการสมัคร">
        <Grid>
          <Item label="เงินเดือนที่ต้องการ" value={get(data, "application.expected_salary")} />
          <Item label="ทราบข่าวจาก" value={get(data, "application.source")} />
        </Grid>
      </Section>

      <Section title="ประวัติส่วนตัว">
        <Grid>
          <Item label="ชื่อ (อังกฤษ)" value={get(data, "personal.name_en")} />
          <Item label="วันเกิด / อายุ"
            value={`${text(get(data, "personal.birth_date"))} (${text(get(data, "personal.age"))} ปี)`} />
          <Item label="เพศ" value={get(data, "personal.gender") === "male" ? "ชาย" : get(data, "personal.gender") === "female" ? "หญิง" : "-"} />
          <Item label="สัญชาติ" value={get(data, "personal.nationality")} />
          <Item label="ศาสนา" value={get(data, "personal.religion")} />
          <Item label="กรุ๊ปเลือด" value={get(data, "personal.blood_type")} />
          <Item label="ส่วนสูง / น้ำหนัก"
            value={`${text(get(data, "personal.height_cm"))} ซม. / ${text(get(data, "personal.weight_kg"))} กก.`} />
          <Item label="เลขบัตรประชาชน" value={get(data, "personal.id_card.no")} />
          <Item label="บัตรหมดอายุ" value={get(data, "personal.id_card.expiry_date")} />
          <Item label="โทรศัพท์บ้าน" value={get(data, "personal.phones.home")} />
          <Item label="สถานภาพสมรส" value={MARITAL[text(get(data, "personal.marital_status"))] ?? get(data, "personal.marital_status")} />
          <Item label="ที่พักอาศัย" value={RESIDENCE[text(get(data, "personal.residence_type"))] ?? get(data, "personal.residence_type")} />
          <Item label="จำนวนบุตร" value={get(data, "personal.children.count")} />
          <Item label="สถานภาพทางทหาร" value={MILITARY[text(get(data, "personal.military_status"))] ?? get(data, "personal.military_status")} />
        </Grid>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Item label="ที่อยู่ปัจจุบัน" value={get(data, "personal.address_present")} />
          <Item label="ที่อยู่ตามทะเบียนบ้าน" value={get(data, "personal.address_registered")} />
        </div>
      </Section>

      {(family.length > 0 || Boolean(get(data, "family.emergency.name"))) && (
        <Section title="ครอบครัว & ผู้ติดต่อฉุกเฉิน">
          {family.length > 0 && (
            <table className="mb-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400">
                  <th className="pb-1 font-normal">ความสัมพันธ์</th>
                  <th className="pb-1 font-normal">ชื่อ-นามสกุล</th>
                  <th className="pb-1 font-normal">อายุ</th>
                  <th className="pb-1 font-normal">อาชีพ</th>
                  <th className="pb-1 font-normal">โทรศัพท์</th>
                </tr>
              </thead>
              <tbody>
                {family.map((m, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="py-1.5">{text(RELATION[text(m.relation)] ?? m.relation)}</td>
                    <td className="py-1.5">{text(m.name)}</td>
                    <td className="py-1.5">{text(m.age)}</td>
                    <td className="py-1.5">{text(m.occupation)}</td>
                    <td className="py-1.5">{text(m.tel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Grid>
            <Item label="ผู้ติดต่อฉุกเฉิน" value={get(data, "family.emergency.name")} />
            <Item label="ความสัมพันธ์" value={get(data, "family.emergency.relationship")} />
            <Item label="โทรศัพท์" value={get(data, "family.emergency.tel")} />
          </Grid>
        </Section>
      )}

      {(education.length > 0 || trainings.length > 0) && (
        <Section title="การศึกษา & การฝึกอบรม">
          {education.map((r, i) => (
            <p key={i} className="text-sm text-stone-800">
              • {text(r.level)} — {text(r.institute)} ({text(r.from)}-{text(r.to)}) {text(r.major)}{" "}
              <span className="text-stone-400">GPA {text(r.gpa)}</span>
            </p>
          ))}
          {text(get(data, "education.professional_license")) !== "-" && (
            <p className="mt-2 text-sm">ใบประกอบวิชาชีพ: {text(get(data, "education.professional_license"))}</p>
          )}
          {trainings.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-stone-400">การฝึกอบรม/สัมมนา</p>
              {trainings.map((t, i) => (
                <p key={i} className="text-sm text-stone-800">
                  • {text(t.course)} — {text(t.organizer)} ({text(t.duration)})
                </p>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="ทักษะ & ภาษา">
        {languages.length > 0 && (
          <table className="mb-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400">
                <th className="pb-1 font-normal">ภาษา</th>
                <th className="pb-1 font-normal">ฟัง</th>
                <th className="pb-1 font-normal">พูด</th>
                <th className="pb-1 font-normal">อ่าน</th>
                <th className="pb-1 font-normal">เขียน</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((l, i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td className="py-1.5">{text(l.name)}</td>
                  {["listening", "speaking", "reading", "writing"].map((k) => (
                    <td key={k} className="py-1.5">{text(LANG_LEVEL[text(l[k])] ?? l[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Grid>
          <Item label="TOEIC" value={get(data, "skills.test_scores.toeic")} />
          <Item label="TOEFL" value={get(data, "skills.test_scores.toefl")} />
          <Item label="IELTS" value={get(data, "skills.test_scores.ielts")} />
          <Item label="คอมพิวเตอร์" value={get(data, "skills.computer")} />
          <Item label="กีฬา" value={get(data, "skills.sports")} />
          <Item label="ความสามารถพิเศษ" value={get(data, "skills.special")} />
          <Item label="มีรถยนต์" value={get(data, "skills.vehicle.car")} />
          <Item label="มีมอเตอร์ไซค์" value={get(data, "skills.vehicle.motorcycle")} />
          <Item label="ใบขับขี่รถยนต์" value={get(data, "skills.driving_license.car")} />
        </Grid>
      </Section>

      {experiences.length > 0 && (
        <Section title="ประสบการณ์ทำงาน">
          <div className="space-y-3">
            {experiences.map((x, i) => (
              <div key={i} className="rounded-lg bg-stone-50 p-3 text-sm">
                <p className="font-medium text-stone-800">
                  {text(x.position)} — {text(x.company)}
                  <span className="ml-2 text-xs font-normal text-stone-400">
                    {text(EMP_TYPE[text(x.employment_type)] ?? x.employment_type)} · {text(x.start)} → {text(x.end)} · เงินเดือน {text(x.salary)}
                  </span>
                </p>
                {text(x.description) !== "-" && (
                  <p className="mt-1 text-stone-600">{text(x.description)}</p>
                )}
                {text(x.leaving_reason) !== "-" && (
                  <p className="mt-1 text-xs text-stone-400">เหตุผลที่ลาออก: {text(x.leaving_reason)}</p>
                )}
              </div>
            ))}
          </div>
          <Grid>
            <Item label="เริ่มงานได้เมื่อ" value={get(data, "experience.available_start_date")} />
            <Item label="ยินยอมให้เช็คประวัตินายจ้างเดิม" value={get(data, "experience.consent_check_previous_employer")} />
          </Grid>
        </Section>
      )}

      <Section title="ข้อมูลเพิ่มเติม">
        <Grid>
          <Item label="เคยถูกให้ออกจากงาน" value={get(data, "further.discharged.answer")} />
          <Item label="เคยป่วยหนัก/โรคติดต่อ" value={get(data, "further.serious_illness.answer")} />
          <Item label="เคยได้รับโทษอาญา/ล้มละลาย" value={get(data, "further.criminal_record.answer")} />
          <Item label="ตั้งครรภ์" value={get(data, "further.pregnant.answer")} />
          <Item label="ญาติ/เพื่อนในบริษัท" value={get(data, "further.relatives_in_company.names") ?? get(data, "further.relatives_in_company.answer")} />
          <Item label="สมาคม/องค์กรวิชาชีพ" value={get(data, "further.associations")} />
        </Grid>
        {references.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-stone-400">บุคคลอ้างอิง</p>
            {references.map((r, i) => (
              <p key={i} className="text-sm text-stone-800">
                • {text(r.name)} ({text(r.occupation)}) โทร {text(r.tel)}
              </p>
            ))}
          </div>
        )}
        {text(get(data, "further.self_introduction")) !== "-" && (
          <div className="mt-3">
            <p className="text-xs text-stone-400">แนะนำตัว</p>
            <p className="whitespace-pre-line text-sm text-stone-800">
              {text(get(data, "further.self_introduction"))}
            </p>
          </div>
        )}
      </Section>

      <Section title="แบบสอบถาม">
        <div className="space-y-3">
          {QUESTIONS.map(([key, label]) => (
            <div key={key}>
              <p className="text-xs text-stone-400">{label}</p>
              <p className="whitespace-pre-line text-sm text-stone-800">
                {text(get(data, `questionnaire.${key}`))}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="ความยินยอม (PDPA)">
        <Grid>
          <Item label="ยินยอมข้อมูลทั่วไป" value={get(data, "consents.pdpa_general")} />
          <Item label="ยินยอมข้อมูลอ่อนไหว" value={get(data, "consents.pdpa_sensitive")} />
          <Item label="รับรองความถูกต้องของข้อมูล" value={get(data, "consents.truth_certified")} />
        </Grid>
      </Section>
    </div>
  );
}
