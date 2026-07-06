"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { submitApplication } from "@/app/(public)/jobs/[id]/apply/actions";

/* ---------- ชนิดข้อมูลของฟอร์ม ---------- */

type Row = Record<string, string>;

interface FormState {
  // step 1
  expected_salary: string;
  source: string;
  position2: string;
  // step 2
  title: string;
  first_name: string;
  last_name: string;
  name_en: string;
  birth_date: string;
  gender: string;
  nationality: string;
  religion: string;
  height_cm: string;
  weight_kg: string;
  blood_type: string;
  id_no: string;
  id_issued_at: string;
  id_issued_date: string;
  id_expiry_date: string;
  phone_home: string;
  phone_office: string;
  phone_mobile: string;
  email: string;
  address_present: string;
  address_registered: string;
  same_address: boolean;
  residence_type: string;
  marital_status: string;
  spouse_has_income: string;
  spouse_income: string;
  children_count: string;
  children_ages: string;
  military_status: string;
  military_note: string;
  // step 3
  family: Row[];
  emergency_name: string;
  emergency_relationship: string;
  emergency_tel: string;
  family_consent: boolean;
  // step 4
  education: Row[];
  professional_license: string;
  trainings: Row[];
  // step 5
  languages: Row[];
  score_toeic: string;
  score_toefl: string;
  score_ielts: string;
  score_chinese: string;
  score_other: string;
  computer_skills: string;
  sports: string;
  special_skills: string;
  office_equipment: string;
  has_car: string;
  has_motorcycle: string;
  license_car: string;
  license_car_type: string;
  license_moto: string;
  // step 6
  experiences: Row[];
  available_start_date: string;
  consent_check_employer: string;
  discharged: string;
  discharged_detail: string;
  serious_illness: string;
  serious_illness_detail: string;
  criminal_record: string;
  criminal_record_detail: string;
  pregnant: string;
  pregnant_months: string;
  relatives_in_company: string;
  relatives_detail: string;
  associations: string;
  references: Row[];
  self_introduction: string;
  recommender_name: string;
  recommender_relationship: string;
  recommender_position: string;
  recommender_office: string;
  q1: string; q2: string; q3: string; q4: string;
  q5: string; q6: string; q7: string; q8: string;
  // step 7
  truth_certified: boolean;
  pdpa_general: boolean;
  pdpa_sensitive: boolean;
  privacy_ack: boolean;
}

const EMPTY: FormState = {
  expected_salary: "", source: "", position2: "",
  title: "", first_name: "", last_name: "", name_en: "", birth_date: "", gender: "",
  nationality: "ไทย", religion: "", height_cm: "", weight_kg: "", blood_type: "",
  id_no: "", id_issued_at: "", id_issued_date: "", id_expiry_date: "",
  phone_home: "", phone_office: "", phone_mobile: "", email: "",
  address_present: "", address_registered: "", same_address: false,
  residence_type: "", marital_status: "", spouse_has_income: "", spouse_income: "",
  children_count: "", children_ages: "", military_status: "", military_note: "",
  family: [], emergency_name: "", emergency_relationship: "", emergency_tel: "",
  family_consent: false,
  education: [], professional_license: "", trainings: [],
  languages: [{ name: "อังกฤษ", listening: "", speaking: "", reading: "", writing: "" }],
  score_toeic: "", score_toefl: "", score_ielts: "", score_chinese: "", score_other: "",
  computer_skills: "", sports: "", special_skills: "", office_equipment: "",
  has_car: "", has_motorcycle: "", license_car: "", license_car_type: "", license_moto: "",
  experiences: [], available_start_date: "", consent_check_employer: "",
  discharged: "", discharged_detail: "", serious_illness: "", serious_illness_detail: "",
  criminal_record: "", criminal_record_detail: "", pregnant: "", pregnant_months: "",
  relatives_in_company: "", relatives_detail: "", associations: "",
  references: [{ name: "", address: "", tel: "", occupation: "" }, { name: "", address: "", tel: "", occupation: "" }],
  self_introduction: "", recommender_name: "", recommender_relationship: "",
  recommender_position: "", recommender_office: "",
  q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "", q8: "",
  truth_certified: false, pdpa_general: false, pdpa_sensitive: false, privacy_ack: false,
};

const STEPS = [
  "ข้อมูลการสมัคร",
  "ประวัติส่วนตัว",
  "ครอบครัว",
  "การศึกษา",
  "ทักษะ",
  "ประสบการณ์",
  "เอกสาร & ยินยอม",
];

const EDU_LEVELS = [
  "ประถมศึกษา", "มัธยมศึกษาตอนต้น", "มัธยมศึกษาตอนปลาย", "ปวช.", "ปวส.",
  "ปริญญาตรี", "ปริญญาโทหรือสูงกว่า", "ปริญญาเอก",
];

function validateThaiID(id: string): boolean {
  const digits = id.replace(/\D/g, "");
  if (digits.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === parseInt(digits[12]);
}

function calcAge(birthDate: string): string {
  if (!birthDate) return "";
  const diff = Date.now() - new Date(birthDate).getTime();
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return age > 0 && age < 100 ? String(age) : "";
}

/* ---------- คอมโพเนนต์หลัก ---------- */

export function ApplyForm({
  jobId,
  jobTitle,
  otherJobs,
}: {
  jobId: string;
  jobTitle: string;
  otherJobs: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const draftKey = `apply-draft-${jobId}`;
  const loaded = useRef(false);

  // โหลด draft จาก localStorage หลัง mount (เลี่ยง hydration mismatch — localStorage
  // อ่านได้เฉพาะฝั่ง client) ใช้ updater form เพื่อ merge โดยไม่ setState ตรงๆ ใน effect
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(draftKey);
    } catch { /* localStorage ใช้ไม่ได้ */ }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลด draft จาก localStorage ต้องทำหลัง mount เพื่อเลี่ยง hydration mismatch
        setForm((prev) => ({ ...prev, ...parsed }));
      } catch { /* draft เสียก็เริ่มใหม่ */ }
    }
    loaded.current = true;
  }, [draftKey]);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(
      () => localStorage.setItem(draftKey, JSON.stringify(form)),
      500
    );
    return () => clearTimeout(t);
  }, [form, draftKey]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateRow(key: "family" | "education" | "trainings" | "languages" | "experiences" | "references",
    index: number, field: string, value: string) {
    setForm((f) => {
      const rows = [...f[key]];
      rows[index] = { ...rows[index], [field]: value };
      return { ...f, [key]: rows };
    });
  }

  function addRow(key: "family" | "education" | "trainings" | "languages" | "experiences", template: Row) {
    setForm((f) => ({ ...f, [key]: [...f[key], template] }));
  }

  function removeRow(key: "family" | "education" | "trainings" | "languages" | "experiences", index: number) {
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.first_name.trim() || !form.last_name.trim()) return "กรุณากรอกชื่อ-นามสกุล";
      if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return "กรุณากรอกอีเมลให้ถูกต้อง";
      if (!form.phone_mobile.trim()) return "กรุณากรอกเบอร์มือถือ";
      if (!form.birth_date) return "กรุณากรอกวันเดือนปีเกิด";
      if (!form.gender) return "กรุณาเลือกเพศ";
      if (form.id_no && !validateThaiID(form.id_no)) return "เลขบัตรประชาชนไม่ถูกต้อง";
      if (!form.address_present.trim()) return "กรุณากรอกที่อยู่ปัจจุบัน";
    }
    if (step === 6) {
      if (!cvFile) return "กรุณาแนบไฟล์ CV/Resume";
      if (!form.truth_certified) return "กรุณายืนยันความถูกต้องของข้อมูล";
      if (!form.privacy_ack) return "กรุณารับทราบประกาศคุ้มครองข้อมูลส่วนบุคคล";
      if (!form.pdpa_general) return "กรุณาให้ความยินยอมในการประมวลผลข้อมูลส่วนบุคคลเพื่อการสมัครงาน";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0 });
  }

  function buildFormData(): Record<string, unknown> {
    return {
      application: {
        position2_job_id: form.position2 || null,
        expected_salary: form.expected_salary ? Number(form.expected_salary) : null,
        source: form.source || null,
      },
      personal: {
        title: form.title, name_en: form.name_en, birth_date: form.birth_date,
        gender: form.gender, age: calcAge(form.birth_date),
        nationality: form.nationality, religion: form.religion || null,
        height_cm: form.height_cm || null, weight_kg: form.weight_kg || null,
        blood_type: form.blood_type || null,
        id_card: {
          no: form.id_no, issued_at: form.id_issued_at,
          issued_date: form.id_issued_date, expiry_date: form.id_expiry_date,
        },
        phones: { home: form.phone_home || null, office: form.phone_office || null, mobile: form.phone_mobile },
        address_present: form.address_present,
        address_registered: form.same_address ? form.address_present : form.address_registered,
        residence_type: form.residence_type || null,
        marital_status: form.marital_status || null,
        spouse_income: form.spouse_has_income === "yes" ? form.spouse_income : null,
        children: { count: form.children_count || "0", ages: form.children_ages },
        military_status: form.gender === "male" ? form.military_status || null : null,
        military_note: form.gender === "male" ? form.military_note || null : null,
      },
      family: {
        members: form.family,
        emergency: { name: form.emergency_name, relationship: form.emergency_relationship, tel: form.emergency_tel },
        family_consent_certified: form.family_consent,
      },
      education: {
        records: form.education,
        professional_license: form.professional_license || null,
        trainings: form.trainings,
      },
      skills: {
        languages: form.languages,
        test_scores: {
          toeic: form.score_toeic || null, toefl: form.score_toefl || null,
          ielts: form.score_ielts || null, chinese: form.score_chinese || null,
          other: form.score_other || null,
        },
        computer: form.computer_skills || null, sports: form.sports || null,
        special: form.special_skills || null, office_equipment: form.office_equipment || null,
        vehicle: { car: form.has_car === "yes", motorcycle: form.has_motorcycle === "yes" },
        driving_license: {
          car: form.license_car === "yes" ? form.license_car_type || "มี" : null,
          motorcycle: form.license_moto === "yes",
        },
      },
      experience: {
        records: form.experiences,
        available_start_date: form.available_start_date || null,
        consent_check_previous_employer: form.consent_check_employer === "yes",
      },
      further: {
        discharged: { answer: form.discharged === "yes", detail: form.discharged_detail || null },
        serious_illness: { answer: form.serious_illness === "yes", detail: form.serious_illness_detail || null },
        criminal_record: { answer: form.criminal_record === "yes", detail: form.criminal_record_detail || null },
        pregnant: { answer: form.pregnant === "yes", months: form.pregnant_months || null },
        relatives_in_company: { answer: form.relatives_in_company === "yes", names: form.relatives_detail || null },
        associations: form.associations || null,
        references: form.references.filter((r) => r.name),
        self_introduction: form.self_introduction || null,
        recommender: {
          name: form.recommender_name || null, relationship: form.recommender_relationship || null,
          position: form.recommender_position || null, office: form.recommender_office || null,
        },
      },
      questionnaire: {
        q1_gained_from_university: form.q1, q2_proudest_achievement: form.q2,
        q3_failure_barrier: form.q3, q4_strengths: form.q4, q5_ideal_boss: form.q5,
        q6_weaknesses: form.q6, q7_personal_goals: form.q7, q8_preferred_job_type: form.q8,
      },
      consents: {
        pdpa_general: form.pdpa_general,
        pdpa_sensitive: form.pdpa_sensitive,
        truth_certified: form.truth_certified,
      },
    };
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("job_id", jobId);
    fd.set(
      "data",
      JSON.stringify({
        firstName: form.first_name,
        lastName: form.last_name,
        email: form.email,
        phone: form.phone_mobile,
        formData: buildFormData(),
        pdpaConsent: form.pdpa_general && form.privacy_ack,
      })
    );
    if (cvFile) fd.set("cv", cvFile);
    if (photoFile) fd.set("photo", photoFile);

    const result = await submitApplication(fd);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    localStorage.removeItem(draftKey);
    router.push(`/apply/success?code=${encodeURIComponent(result.trackingCode)}`);
  }

  const yesNo = (
    value: string,
    onChange: (v: string) => void,
    yesLabel = "เคย/มี",
    noLabel = "ไม่เคย/ไม่มี"
  ) => (
    <div className="flex gap-4 text-sm">
      <label className="flex items-center gap-1.5">
        <input type="radio" checked={value === "no"} onChange={() => onChange("no")} /> {noLabel}
      </label>
      <label className="flex items-center gap-1.5">
        <input type="radio" checked={value === "yes"} onChange={() => onChange("yes")} /> {yesLabel}
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-stone-500">สมัครตำแหน่ง</p>
      <h1 className="text-2xl font-bold text-stone-900">{jobTitle}</h1>

      {/* progress */}
      <ol className="mt-6 flex flex-wrap gap-1.5">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === step
                ? "bg-emerald-700 text-white"
                : i < step
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-stone-100 text-stone-400"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <Card className="mt-4">
        {/* ---------- STEP 1 ข้อมูลการสมัคร ---------- */}
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="เงินเดือนที่ต้องการ (บาท/เดือน)">
              <Input type="number" value={form.expected_salary}
                onChange={(e) => set("expected_salary", e.target.value)} />
            </Field>
            <Field label="ตำแหน่งสำรอง (ถ้ามี)">
              <Select value={form.position2} onChange={(e) => set("position2", e.target.value)}>
                <option value="">— ไม่ระบุ —</option>
                {otherJobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="ท่านทราบข่าวการรับสมัครจาก" className="sm:col-span-2">
              <Input value={form.source} onChange={(e) => set("source", e.target.value)}
                placeholder="เช่น เว็บไซต์บริษัท, JobsDB, เพื่อนแนะนำ" />
            </Field>
            <Field label="รูปถ่าย 1-2 นิ้ว (ไม่เกิน 2MB)" className="sm:col-span-2">
              <Input type="file" accept="image/jpeg,image/png"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              {photoFile && <p className="mt-1 text-xs text-emerald-700">✓ {photoFile.name}</p>}
            </Field>
          </div>
        )}

        {/* ---------- STEP 2 ประวัติส่วนตัว ---------- */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="คำนำหน้า">
              <Select value={form.title} onChange={(e) => set("title", e.target.value)}>
                <option value="">เลือก</option>
                <option>นาย</option><option>นาง</option><option>นางสาว</option>
              </Select>
            </Field>
            <Field label="ชื่อ (ภาษาไทย)" required>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </Field>
            <Field label="นามสกุล (ภาษาไทย)" required>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </Field>
            <Field label="Name - Surname (English)" className="sm:col-span-3">
              <Input value={form.name_en} onChange={(e) => set("name_en", e.target.value)} />
            </Field>
            <Field label="วันเดือนปีเกิด" required>
              <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </Field>
            <Field label="เพศ" required>
              <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">เลือก</option>
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
              </Select>
            </Field>
            <Field label="อายุ">
              <Input value={calcAge(form.birth_date)} disabled placeholder="คำนวณอัตโนมัติ" />
            </Field>
            <Field label="สัญชาติ">
              <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
            </Field>
            <Field label="ศาสนา" hint="ไม่บังคับ (ข้อมูลอ่อนไหว)">
              <Input value={form.religion} onChange={(e) => set("religion", e.target.value)} />
            </Field>
            <Field label="กรุ๊ปเลือด" hint="ไม่บังคับ (ข้อมูลอ่อนไหว)">
              <Select value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)}>
                <option value="">ไม่ระบุ</option>
                <option>A</option><option>B</option><option>AB</option><option>O</option>
              </Select>
            </Field>
            <Field label="ส่วนสูง (ซม.)">
              <Input type="number" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
            </Field>
            <Field label="น้ำหนัก (กก.)">
              <Input type="number" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
            </Field>
            <div className="sm:col-span-3 border-t border-stone-100 pt-2" />
            <Field label="เลขที่บัตรประชาชน">
              <Input value={form.id_no} maxLength={13}
                onChange={(e) => set("id_no", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="สถานที่ออกบัตร">
              <Input value={form.id_issued_at} onChange={(e) => set("id_issued_at", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="วันออกบัตร">
                <Input type="date" value={form.id_issued_date} onChange={(e) => set("id_issued_date", e.target.value)} />
              </Field>
              <Field label="วันหมดอายุ">
                <Input type="date" value={form.id_expiry_date} onChange={(e) => set("id_expiry_date", e.target.value)} />
              </Field>
            </div>
            <Field label="เบอร์มือถือ" required>
              <Input value={form.phone_mobile} onChange={(e) => set("phone_mobile", e.target.value)} />
            </Field>
            <Field label="โทรศัพท์บ้าน">
              <Input value={form.phone_home} onChange={(e) => set("phone_home", e.target.value)} />
            </Field>
            <Field label="E-mail" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="ที่อยู่ปัจจุบัน" required className="sm:col-span-3">
              <Textarea rows={2} value={form.address_present}
                onChange={(e) => set("address_present", e.target.value)} />
            </Field>
            <div className="sm:col-span-3">
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" checked={form.same_address}
                  onChange={(e) => set("same_address", e.target.checked)} />
                ที่อยู่ตามทะเบียนบ้านเหมือนที่อยู่ปัจจุบัน
              </label>
              {!form.same_address && (
                <Textarea rows={2} className="mt-2" placeholder="ที่อยู่ตามสำเนาทะเบียนบ้าน"
                  value={form.address_registered}
                  onChange={(e) => set("address_registered", e.target.value)} />
              )}
            </div>
            <Field label="ที่พักอาศัย">
              <Select value={form.residence_type} onChange={(e) => set("residence_type", e.target.value)}>
                <option value="">เลือก</option>
                <option value="parents">อยู่กับบิดามารดา</option>
                <option value="own">บ้านของตนเอง</option>
                <option value="rented">หอพัก/บ้านเช่า</option>
                <option value="other">อื่นๆ</option>
              </Select>
            </Field>
            <Field label="สถานภาพการสมรส">
              <Select value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)}>
                <option value="">เลือก</option>
                <option value="single">โสด</option>
                <option value="married">แต่งงาน</option>
                <option value="married_unregistered">แต่งงานไม่จดทะเบียน</option>
                <option value="widowed">หม้าย</option>
                <option value="divorced">หย่า</option>
                <option value="separated">แยกกันอยู่</option>
              </Select>
            </Field>
            {["married", "married_unregistered"].includes(form.marital_status) && (
              <Field label="คู่สมรสมีรายได้หรือไม่">
                <div className="flex items-center gap-3">
                  {yesNo(form.spouse_has_income, (v) => set("spouse_has_income", v), "มี", "ไม่มี")}
                </div>
                {form.spouse_has_income === "yes" && (
                  <Input className="mt-2" type="number" placeholder="บาท/เดือน"
                    value={form.spouse_income} onChange={(e) => set("spouse_income", e.target.value)} />
                )}
              </Field>
            )}
            <Field label="จำนวนบุตร">
              <Input type="number" value={form.children_count}
                onChange={(e) => set("children_count", e.target.value)} />
            </Field>
            {Number(form.children_count) > 0 && (
              <Field label="อายุของบุตรตามลำดับ" className="sm:col-span-2">
                <Input placeholder="เช่น 5, 8, 12" value={form.children_ages}
                  onChange={(e) => set("children_ages", e.target.value)} />
              </Field>
            )}
            {form.gender === "male" && (
              <>
                <Field label="สถานภาพทางทหาร" className="sm:col-span-2">
                  <Select value={form.military_status} onChange={(e) => set("military_status", e.target.value)}>
                    <option value="">เลือก</option>
                    <option value="completed">ผ่านการเกณฑ์ทหารแล้ว</option>
                    <option value="exempted">ได้รับการยกเว้น</option>
                    <option value="other">อื่นๆ</option>
                  </Select>
                </Field>
                {["exempted", "other"].includes(form.military_status) && (
                  <Field label="ระบุเหตุผล/รายละเอียด">
                    <Input value={form.military_note} onChange={(e) => set("military_note", e.target.value)} />
                  </Field>
                )}
              </>
            )}
          </div>
        )}

        {/* ---------- STEP 3 ครอบครัว ---------- */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              ข้อมูลบิดา มารดา คู่สมรส และพี่น้อง (กรอกเท่าที่มี)
            </p>
            {form.family.map((m, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-6">
                <Select value={m.relation ?? ""} onChange={(e) => updateRow("family", i, "relation", e.target.value)}>
                  <option value="">ความสัมพันธ์</option>
                  <option value="father">บิดา</option>
                  <option value="mother">มารดา</option>
                  <option value="spouse">คู่สมรส</option>
                  <option value="elder_sibling">พี่</option>
                  <option value="younger_sibling">น้อง</option>
                </Select>
                <Input className="sm:col-span-2" placeholder="ชื่อ-นามสกุล" value={m.name ?? ""}
                  onChange={(e) => updateRow("family", i, "name", e.target.value)} />
                <Input placeholder="อายุ" value={m.age ?? ""}
                  onChange={(e) => updateRow("family", i, "age", e.target.value)} />
                <Input placeholder="อาชีพ/ที่ทำงาน" value={m.occupation ?? ""}
                  onChange={(e) => updateRow("family", i, "occupation", e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder="โทรศัพท์" value={m.tel ?? ""}
                    onChange={(e) => updateRow("family", i, "tel", e.target.value)} />
                  <Button type="button" variant="ghost" onClick={() => removeRow("family", i)}>✕</Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary"
              onClick={() => addRow("family", { relation: "", name: "", age: "", occupation: "", tel: "" })}>
              + เพิ่มสมาชิกครอบครัว
            </Button>

            <div className="border-t border-stone-100 pt-4">
              <p className="mb-2 text-sm font-medium text-stone-700">กรณีเร่งด่วนติดต่อ</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="ชื่อ-นามสกุล" value={form.emergency_name}
                  onChange={(e) => set("emergency_name", e.target.value)} />
                <Input placeholder="ความสัมพันธ์" value={form.emergency_relationship}
                  onChange={(e) => set("emergency_relationship", e.target.value)} />
                <Input placeholder="โทรศัพท์" value={form.emergency_tel}
                  onChange={(e) => set("emergency_tel", e.target.value)} />
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-stone-600">
              <input type="checkbox" className="mt-1" checked={form.family_consent}
                onChange={(e) => set("family_consent", e.target.checked)} />
              ข้าพเจ้าขอรับรองว่าได้รับอนุญาตจากบุคคลที่มีรายชื่อข้างต้น
              ให้เปิดเผยข้อมูลส่วนบุคคลแก่บริษัท เพื่อให้บริษัทสามารถติดต่อ
              สอบถามข้อมูล และยืนยันข้อมูลเกี่ยวกับตัวข้าพเจ้า
            </label>
          </div>
        )}

        {/* ---------- STEP 4 การศึกษา ---------- */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">ประวัติการศึกษา (กรอกเฉพาะระดับที่มี)</p>
            {form.education.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-6">
                <Select value={r.level ?? ""} onChange={(e) => updateRow("education", i, "level", e.target.value)}>
                  <option value="">ระดับ</option>
                  {EDU_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </Select>
                <div className="flex gap-1">
                  <Input placeholder="ปีเริ่ม" value={r.from ?? ""}
                    onChange={(e) => updateRow("education", i, "from", e.target.value)} />
                  <Input placeholder="ปีจบ" value={r.to ?? ""}
                    onChange={(e) => updateRow("education", i, "to", e.target.value)} />
                </div>
                <Input className="sm:col-span-2" placeholder="สถานศึกษาและที่ตั้ง" value={r.institute ?? ""}
                  onChange={(e) => updateRow("education", i, "institute", e.target.value)} />
                <Input placeholder="วุฒิ/วิชาเอก" value={r.major ?? ""}
                  onChange={(e) => updateRow("education", i, "major", e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder="GPA" value={r.gpa ?? ""}
                    onChange={(e) => updateRow("education", i, "gpa", e.target.value)} />
                  <Button type="button" variant="ghost" onClick={() => removeRow("education", i)}>✕</Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary"
              onClick={() => addRow("education", { level: "", from: "", to: "", institute: "", major: "", gpa: "" })}>
              + เพิ่มประวัติการศึกษา
            </Button>

            <Field label="ใบประกอบวิชาชีพ (ถ้ามี)">
              <Input value={form.professional_license}
                onChange={(e) => set("professional_license", e.target.value)} />
            </Field>

            <div className="border-t border-stone-100 pt-4">
              <p className="mb-2 text-sm font-medium text-stone-700">การฝึกอบรม / สัมมนา</p>
              {form.trainings.map((r, i) => (
                <div key={i} className="mb-2 grid gap-2 sm:grid-cols-5">
                  <Input className="sm:col-span-2" placeholder="ชื่อหลักสูตร" value={r.course ?? ""}
                    onChange={(e) => updateRow("trainings", i, "course", e.target.value)} />
                  <Input placeholder="หน่วยงานผู้จัด" value={r.organizer ?? ""}
                    onChange={(e) => updateRow("trainings", i, "organizer", e.target.value)} />
                  <Input placeholder="ระยะเวลา" value={r.duration ?? ""}
                    onChange={(e) => updateRow("trainings", i, "duration", e.target.value)} />
                  <div className="flex gap-2">
                    <Input placeholder="วุฒิที่ได้รับ" value={r.certificate ?? ""}
                      onChange={(e) => updateRow("trainings", i, "certificate", e.target.value)} />
                    <Button type="button" variant="ghost" onClick={() => removeRow("trainings", i)}>✕</Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary"
                onClick={() => addRow("trainings", { course: "", organizer: "", duration: "", certificate: "" })}>
                + เพิ่มการฝึกอบรม
              </Button>
            </div>
          </div>
        )}

        {/* ---------- STEP 5 ทักษะ ---------- */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-stone-700">ความสามารถทางภาษา (ดีมาก / ดี / พอใช้)</p>
            {form.languages.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-6">
                <Input placeholder="ภาษา" value={l.name ?? ""}
                  onChange={(e) => updateRow("languages", i, "name", e.target.value)} />
                {(["listening", "speaking", "reading", "writing"] as const).map((skill, si) => (
                  <Select key={skill} value={l[skill] ?? ""}
                    onChange={(e) => updateRow("languages", i, skill, e.target.value)}>
                    <option value="">{["การฟัง", "การพูด", "การอ่าน", "การเขียน"][si]}</option>
                    <option value="excellent">ดีมาก</option>
                    <option value="good">ดี</option>
                    <option value="fair">พอใช้</option>
                  </Select>
                ))}
                {i > 0 ? (
                  <Button type="button" variant="ghost" onClick={() => removeRow("languages", i)}>✕</Button>
                ) : <span />}
              </div>
            ))}
            <Button type="button" variant="secondary"
              onClick={() => addRow("languages", { name: "", listening: "", speaking: "", reading: "", writing: "" })}>
              + เพิ่มภาษา
            </Button>

            <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-3">
              <Field label="คะแนน TOEIC"><Input value={form.score_toeic} onChange={(e) => set("score_toeic", e.target.value)} /></Field>
              <Field label="คะแนน TOEFL"><Input value={form.score_toefl} onChange={(e) => set("score_toefl", e.target.value)} /></Field>
              <Field label="คะแนน IELTS"><Input value={form.score_ielts} onChange={(e) => set("score_ielts", e.target.value)} /></Field>
              <Field label="คะแนนภาษาจีน"><Input value={form.score_chinese} onChange={(e) => set("score_chinese", e.target.value)} /></Field>
              <Field label="คะแนนภาษาอื่นๆ" className="sm:col-span-2">
                <Input value={form.score_other} onChange={(e) => set("score_other", e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
              <Field label="ทักษะทางด้านคอมพิวเตอร์">
                <Input value={form.computer_skills} onChange={(e) => set("computer_skills", e.target.value)} />
              </Field>
              <Field label="กีฬา"><Input value={form.sports} onChange={(e) => set("sports", e.target.value)} /></Field>
              <Field label="ความสามารถพิเศษอื่นๆ">
                <Input value={form.special_skills} onChange={(e) => set("special_skills", e.target.value)} />
              </Field>
              <Field label="การใช้เครื่องใช้สำนักงาน">
                <Input value={form.office_equipment} onChange={(e) => set("office_equipment", e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
              <Field label="มีรถยนต์ส่วนตัวที่ใช้ในธุระของบริษัทได้">
                {yesNo(form.has_car, (v) => set("has_car", v), "มี", "ไม่มี")}
              </Field>
              <Field label="มีมอเตอร์ไซค์ส่วนตัวที่ใช้ในธุระของบริษัทได้">
                {yesNo(form.has_motorcycle, (v) => set("has_motorcycle", v), "มี", "ไม่มี")}
              </Field>
              <Field label="ใบขับขี่รถยนต์">
                {yesNo(form.license_car, (v) => set("license_car", v), "มี", "ไม่มี")}
                {form.license_car === "yes" && (
                  <Input className="mt-2" placeholder="ประเภท" value={form.license_car_type}
                    onChange={(e) => set("license_car_type", e.target.value)} />
                )}
              </Field>
              <Field label="ใบขับขี่มอเตอร์ไซค์">
                {yesNo(form.license_moto, (v) => set("license_moto", v), "มี", "ไม่มี")}
              </Field>
            </div>
          </div>
        )}

        {/* ---------- STEP 6 ประสบการณ์ + ข้อมูลเพิ่มเติม ---------- */}
        {step === 5 && (
          <div className="space-y-5">
            <p className="text-sm font-medium text-stone-700">
              ประวัติการทำงาน (เรียงจากปัจจุบันไปหาอดีต)
            </p>
            {form.experiences.map((x, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-2">
                <Input placeholder="ชื่อสถานที่ทำงาน" value={x.company ?? ""}
                  onChange={(e) => updateRow("experiences", i, "company", e.target.value)} />
                <Input placeholder="ตำแหน่งงาน" value={x.position ?? ""}
                  onChange={(e) => updateRow("experiences", i, "position", e.target.value)} />
                <Select value={x.employment_type ?? ""}
                  onChange={(e) => updateRow("experiences", i, "employment_type", e.target.value)}>
                  <option value="">ประเภทการจ้างงาน</option>
                  <option value="full_time">ประจำ</option>
                  <option value="contract">ชั่วคราว/สัญญาจ้าง</option>
                  <option value="internship">ฝึกงาน</option>
                </Select>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <Input type="month" value={x.start ?? ""}
                    onChange={(e) => updateRow("experiences", i, "start", e.target.value)} />
                  →
                  <Input type="month" value={x.end ?? ""}
                    onChange={(e) => updateRow("experiences", i, "end", e.target.value)} />
                </div>
                <Input placeholder="เงินเดือน" value={x.salary ?? ""}
                  onChange={(e) => updateRow("experiences", i, "salary", e.target.value)} />
                <Input placeholder="เหตุผลในการลาออก" value={x.leaving_reason ?? ""}
                  onChange={(e) => updateRow("experiences", i, "leaving_reason", e.target.value)} />
                <Textarea className="sm:col-span-2" rows={2} placeholder="ลักษณะงานที่รับผิดชอบ"
                  value={x.description ?? ""}
                  onChange={(e) => updateRow("experiences", i, "description", e.target.value)} />
                <Button type="button" variant="ghost" className="justify-self-start"
                  onClick={() => removeRow("experiences", i)}>✕ ลบรายการนี้</Button>
              </div>
            ))}
            <Button type="button" variant="secondary"
              onClick={() => addRow("experiences", {
                company: "", position: "", employment_type: "", start: "", end: "",
                salary: "", leaving_reason: "", description: "",
              })}>
              + เพิ่มประสบการณ์ทำงาน
            </Button>

            <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
              <Field label="ท่านสามารถเริ่มงานได้เมื่อ">
                <Input type="date" value={form.available_start_date}
                  onChange={(e) => set("available_start_date", e.target.value)} />
              </Field>
              <Field label="ยินยอมให้บริษัทตรวจสอบประวัติกับนายจ้างเดิม">
                {yesNo(form.consent_check_employer, (v) => set("consent_check_employer", v), "ยินยอม", "ไม่ยินยอม")}
              </Field>
            </div>

            <div className="space-y-3 border-t border-stone-100 pt-4">
              <p className="text-sm font-medium text-stone-700">ข้อมูลเพิ่มเติม</p>
              <Field label="1) ท่านเคยถูกให้ออกจากงานหรือไม่?">
                {yesNo(form.discharged, (v) => set("discharged", v))}
                {form.discharged === "yes" && (
                  <Input className="mt-2" placeholder="เพราะ..." value={form.discharged_detail}
                    onChange={(e) => set("discharged_detail", e.target.value)} />
                )}
              </Field>
              <Field label="2) ท่านเคยป่วยหนักหรือเป็นโรคติดต่อร้ายแรงมาก่อนหรือไม่?"
                hint="ไม่บังคับ (ข้อมูลอ่อนไหว)">
                {yesNo(form.serious_illness, (v) => set("serious_illness", v))}
                {form.serious_illness === "yes" && (
                  <Input className="mt-2" placeholder="ระบุชื่อโรค" value={form.serious_illness_detail}
                    onChange={(e) => set("serious_illness_detail", e.target.value)} />
                )}
              </Field>
              <Field label="3) ท่านเคยได้รับโทษทางอาญา หรือเป็นบุคคลล้มละลายหรือไม่?"
                hint="ไม่บังคับ (ข้อมูลอ่อนไหว)">
                {yesNo(form.criminal_record, (v) => set("criminal_record", v))}
                {form.criminal_record === "yes" && (
                  <Input className="mt-2" placeholder="รายละเอียด" value={form.criminal_record_detail}
                    onChange={(e) => set("criminal_record_detail", e.target.value)} />
                )}
              </Field>
              {form.gender === "female" && (
                <Field label="4) ขณะนี้ท่านตั้งครรภ์หรือไม่?" hint="ไม่บังคับ (ข้อมูลอ่อนไหว)">
                  {yesNo(form.pregnant, (v) => set("pregnant", v), "ตั้งครรภ์", "ไม่ได้ตั้งครรภ์")}
                  {form.pregnant === "yes" && (
                    <Input className="mt-2" type="number" placeholder="กี่เดือน" value={form.pregnant_months}
                      onChange={(e) => set("pregnant_months", e.target.value)} />
                  )}
                </Field>
              )}
              <Field label="5) ท่านมีเพื่อน คนรู้จัก หรือญาติที่ทำงานในบริษัทนี้หรือไม่?">
                {yesNo(form.relatives_in_company, (v) => set("relatives_in_company", v), "มี", "ไม่มี")}
                {form.relatives_in_company === "yes" && (
                  <Input className="mt-2" placeholder="ระบุชื่อ-นามสกุล" value={form.relatives_detail}
                    onChange={(e) => set("relatives_detail", e.target.value)} />
                )}
              </Field>
              <Field label="6) ท่านเป็นสมาชิกของสมาคมหรือองค์กรวิชาชีพใด และตำแหน่งอะไร">
                <Input value={form.associations} onChange={(e) => set("associations", e.target.value)} />
              </Field>
            </div>

            <div className="space-y-2 border-t border-stone-100 pt-4">
              <p className="text-sm font-medium text-stone-700">
                บุคคลอ้างอิง 2 คน (ที่ไม่ใช่ญาติหรือนายจ้างเดิม)
              </p>
              {form.references.map((r, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-4">
                  <Input placeholder={`คนที่ ${i + 1}: ชื่อ-นามสกุล`} value={r.name ?? ""}
                    onChange={(e) => updateRow("references", i, "name", e.target.value)} />
                  <Input placeholder="อาชีพ" value={r.occupation ?? ""}
                    onChange={(e) => updateRow("references", i, "occupation", e.target.value)} />
                  <Input placeholder="ที่อยู่/ที่ทำงาน" value={r.address ?? ""}
                    onChange={(e) => updateRow("references", i, "address", e.target.value)} />
                  <Input placeholder="โทรศัพท์" value={r.tel ?? ""}
                    onChange={(e) => updateRow("references", i, "tel", e.target.value)} />
                </div>
              ))}
            </div>

            <Field label="กรุณาแนะนำตัวท่านเอง เพื่อให้บริษัทรู้จักตัวท่านดีขึ้น">
              <Textarea rows={3} value={form.self_introduction}
                onChange={(e) => set("self_introduction", e.target.value)} />
            </Field>

            <div className="grid gap-2 border-t border-stone-100 pt-4 sm:grid-cols-2">
              <p className="text-sm font-medium text-stone-700 sm:col-span-2">
                ผู้แนะนำ / ผู้รับรอง (ถ้ามี)
              </p>
              <Input placeholder="ชื่อ-นามสกุล" value={form.recommender_name}
                onChange={(e) => set("recommender_name", e.target.value)} />
              <Input placeholder="ความสัมพันธ์" value={form.recommender_relationship}
                onChange={(e) => set("recommender_relationship", e.target.value)} />
              <Input placeholder="ตำแหน่ง" value={form.recommender_position}
                onChange={(e) => set("recommender_position", e.target.value)} />
              <Input placeholder="ที่อยู่ที่ทำงาน / โทรศัพท์" value={form.recommender_office}
                onChange={(e) => set("recommender_office", e.target.value)} />
            </div>

            <div className="space-y-3 border-t border-stone-100 pt-4">
              <p className="text-sm font-medium text-stone-700">แบบสอบถาม</p>
              {([
                ["q1", "1) ท่านได้รับอะไรจากสถาบันการศึกษา ที่เป็นประโยชน์ต่อการทำงานของท่านในอนาคต"],
                ["q2", "2) กรุณาเล่าถึงความสำเร็จที่ผ่านมา ที่ท่านมีความภูมิใจสูงสุด"],
                ["q3", "3) กรุณาเล่าถึงความล้มเหลว / ความผิดหวัง / อุปสรรค ในการทำงานที่ผ่านมาของท่าน"],
                ["q4", "4) คุณสมบัติเด่นของท่านมีอะไรบ้าง"],
                ["q5", "5) ในทัศนะของท่าน ท่านชอบทำงานกับผู้บังคับบัญชาที่มีลักษณะผู้นำแบบใด"],
                ["q6", "6) ท่านคิดว่ายังมีจุดอ่อนเรื่องใดบ้างที่ยังต้องปรับปรุงให้ดีขึ้น"],
                ["q7", "7) ท่านตั้งเป้าหมายในชีวิตส่วนตัวอย่างไร"],
                ["q8", "8) ลักษณะงานแบบใดที่ท่านชอบ และคิดว่าสำคัญกับท่าน เพราะสาเหตุใด"],
              ] as const).map(([key, label]) => (
                <Field key={key} label={label}>
                  <Textarea rows={2} value={form[key]}
                    onChange={(e) => set(key, e.target.value)} />
                </Field>
              ))}
            </div>
          </div>
        )}

        {/* ---------- STEP 7 เอกสาร + ยินยอม ---------- */}
        {step === 6 && (
          <div className="space-y-5">
            <Field label="CV / Resume (PDF หรือ Word ไม่เกิน 5MB)" required>
              <Input type="file" accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} />
              {cvFile && <p className="mt-1 text-xs text-emerald-700">✓ {cvFile.name}</p>}
            </Field>

            <div className="rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-600">
              <p className="font-medium text-stone-800">สรุปข้อมูลผู้สมัคร</p>
              <p>
                {form.title} {form.first_name} {form.last_name} · {form.email} ·{" "}
                {form.phone_mobile}
              </p>
              <p className="text-xs text-stone-400">
                กรุณาตรวจสอบข้อมูลในแต่ละขั้นตอนให้ถูกต้องก่อนส่งใบสมัคร
                (กดย้อนกลับเพื่อแก้ไขได้)
              </p>
            </div>

            <div className="space-y-3 border-t border-stone-100 pt-4">
              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input type="checkbox" className="mt-1" checked={form.truth_certified}
                  onChange={(e) => set("truth_certified", e.target.checked)} />
                ข้าพเจ้าขอรับรองว่าข้อความทั้งหมดในใบสมัครนี้เป็นความจริงทุกประการ
                หากภายหลังปรากฏว่าข้อความไม่เป็นความจริง
                บริษัทมีสิทธิ์เลิกจ้างข้าพเจ้าโดยไม่ต้องจ่ายเงินชดเชยหรือค่าเสียหายใดๆ ทั้งสิ้น
                <span className="text-rose-500">*</span>
              </label>

              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input type="checkbox" className="mt-1" checked={form.privacy_ack}
                  onChange={(e) => set("privacy_ack", e.target.checked)} />
                <span>
                  ข้าพเจ้าได้อ่านและรับทราบ{" "}
                  <Link href="/privacy-notice" target="_blank"
                    className="text-emerald-700 underline">
                    ประกาศคุ้มครองข้อมูลส่วนบุคคลสำหรับผู้สมัครงาน
                  </Link>{" "}
                  เรียบร้อยแล้ว <span className="text-rose-500">*</span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input type="checkbox" className="mt-1" checked={form.pdpa_general}
                  onChange={(e) => set("pdpa_general", e.target.checked)} />
                ข้าพเจ้ายินยอมให้บริษัทประมวลผลข้อมูลส่วนบุคคลของข้าพเจ้า
                เพื่อพิจารณาตำแหน่งงานที่เหมาะสม
                และแจ้งเตือนเมื่อมีประกาศรับสมัครงานใหม่{" "}
                <span className="text-rose-500">*</span>
              </label>

              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input type="checkbox" className="mt-1" checked={form.pdpa_sensitive}
                  onChange={(e) => set("pdpa_sensitive", e.target.checked)} />
                ข้าพเจ้ายินยอมให้บริษัทเก็บรวบรวม ใช้
                และเปิดเผยข้อมูลส่วนบุคคลที่มีความอ่อนไหว (เช่น ศาสนา ข้อมูลสุขภาพ
                ประวัติอาชญากรรม กรุ๊ปเลือด)
                เพื่อพิจารณาตำแหน่งงานและสถานที่ปฏิบัติงานที่เหมาะสม
                (ไม่บังคับ — หากไม่ยินยอม ระบบจะไม่บันทึกข้อมูลกลุ่มนี้)
              </label>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-between border-t border-stone-100 pt-4">
          <Button type="button" variant="secondary" onClick={back} disabled={step === 0}>
            ← ย้อนกลับ
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>ถัดไป →</Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "กำลังส่งใบสมัคร..." : "ส่งใบสมัคร"}
            </Button>
          )}
        </div>
      </Card>

      <p className="mt-3 text-center text-xs text-stone-400">
        ระบบบันทึกร่างข้อมูลในเครื่องของคุณโดยอัตโนมัติ ปิดหน้านี้แล้วกลับมากรอกต่อได้
      </p>
    </div>
  );
}
