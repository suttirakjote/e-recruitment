"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";

export default function HrLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      // log ไว้ช่วย debug (เช่น anon key ผิด / rate limit) โดยไม่โชว์รายละเอียดให้ผู้ใช้เห็น
      console.error("HR login error:", authError.message);
      setLoading(false);
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.push("/hr");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-stone-900">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-stone-500">
          สำหรับพนักงาน, HR และผู้อนุมัติ (บัญชีสร้างโดยผู้ดูแลระบบ) —
          ระบบจะพาไปหน้าที่ตรงกับสิทธิ์ของคุณโดยอัตโนมัติ
        </p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <Field label="อีเมล" required>
            <Input type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="รหัสผ่าน" required>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                required
                autoComplete="current-password"
                className="pr-16"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-stone-500 hover:text-stone-700"
              >
                {showPassword ? "ซ่อน" : "แสดง"}
              </button>
            </div>
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
