import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/auth";

/** เมนูตั้งค่าทั้งหมดจำกัดเฉพาะผู้ดูแลระบบ (hr_admin) */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) {
    redirect("/hr");
  }
  return <>{children}</>;
}
