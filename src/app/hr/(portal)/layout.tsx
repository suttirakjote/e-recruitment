import Link from "next/link";
import { getProfile, isAdmin } from "@/lib/auth";
import { HR_ROLE_LABELS } from "@/lib/status";
import { SignOutButton } from "@/components/hr/sign-out-button";
import { Avatar } from "@/components/hr/avatar";

export default async function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100 px-4 text-center">
        <p className="text-lg font-medium text-stone-800">
          บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งาน HR Portal
        </p>
        <p className="text-sm text-stone-500">
          กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดสิทธิ์การใช้งาน
        </p>
        <div className="w-40 rounded-lg bg-stone-900 text-center">
          <SignOutButton />
        </div>
      </div>
    );
  }

  const links = [
    { href: "/hr", label: "ภาพรวม" },
    { href: "/hr/jobs", label: "ตำแหน่งงาน" },
    { href: "/hr/applications", label: "ใบสมัคร" },
    { href: "/hr/approvals", label: "รอฉันอนุมัติ" },
    { href: "/hr/approval-process", label: "สถานะการอนุมัติ" },
  ];

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="fixed inset-y-0 flex w-60 flex-col bg-stone-900 p-4 text-white">
        <Link href="/hr" className="px-3 py-2 text-lg font-bold">
          E-Recruitment
        </Link>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          {isAdmin(profile) && (
            <>
              <p className="mt-4 px-3 text-xs font-medium uppercase text-stone-500">
                ตั้งค่าระบบ
              </p>
              {[
                { href: "/hr/settings/users", label: "ผู้ใช้งาน" },
                { href: "/hr/settings/departments", label: "แผนก & สายอนุมัติ" },
                { href: "/hr/settings/email", label: "ตั้งค่าอีเมล" },
                { href: "/hr/settings/privacy-notice", label: "Privacy Notice" },
                { href: "/hr/settings/general", label: "ทั่วไป" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="border-t border-stone-700 pt-3">
          <Link href="/hr/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-stone-800">
            <Avatar photoPath={profile.photo_path} name={profile.full_name} size={36} />
            <span>
              <span className="block text-sm font-medium">{profile.full_name}</span>
              <span className="block text-xs text-stone-400">{HR_ROLE_LABELS[profile.role]}</span>
            </span>
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}
