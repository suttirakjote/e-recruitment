"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";

export default function HrLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <h1 className="text-xl font-bold text-stone-900">HR Portal</h1>
        <p className="mt-1 text-sm text-stone-500">
          สำหรับพนักงาน HR และผู้อนุมัติ (บัญชีสร้างโดยผู้ดูแลระบบ)
        </p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <Field label="อีเมล" required>
            <Input type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="รหัสผ่าน" required>
            <Input type="password" value={password} required
              onChange={(e) => setPassword(e.target.value)} />
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
