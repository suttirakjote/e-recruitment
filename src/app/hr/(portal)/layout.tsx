import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, isAdmin, isHrPortalUser } from "@/lib/auth";
import { getOrgName } from "@/lib/settings";
import { HR_ROLE_LABELS } from "@/lib/status";
import { SignOutButton } from "@/components/hr/sign-out-button";
import { Avatar } from "@/components/hr/avatar";

interface NavItem {
  href: string;
  label: string;
}
interface NavGroup {
  title: string | null;
  items: NavItem[];
}

export default async function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, orgName] = await Promise.all([getProfile(), getOrgName()]);

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100 px-4 text-center">
        <p className="text-lg font-medium text-stone-800">
          บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งานระบบ
        </p>
        <p className="text-sm text-stone-500">กรุณาติดต่อผู้ดูแลระบบ</p>
        <div className="w-40 rounded-lg bg-stone-900 text-center">
          <SignOutButton />
        </div>
      </div>
    );
  }

  // พนักงานทั่วไป (ไม่ใช่ HR) → ส่งไปหน้า Self-Service
  if (!isHrPortalUser(profile)) {
    redirect("/me");
  }

  const groups: NavGroup[] = [
    {
      title: null,
      items: [
        { href: "/hr", label: "ภาพรวม" },
        { href: "/hr/leave-summary", label: "สรุปวันลา" },
      ],
    },
    {
      title: "บุคลากร",
      items: [
        { href: "/hr/employees", label: "ทำเนียบพนักงาน" },
        { href: "/hr/attendance", label: "ลงเวลาทำงาน" },
      ],
    },
    {
      title: "สรรหาบุคลากร",
      items: [
        { href: "/hr/recruitment/jobs", label: "ตำแหน่งงาน" },
        { href: "/hr/recruitment/applications", label: "ใบสมัคร" },
        { href: "/hr/recruitment/approvals", label: "รอฉันอนุมัติ" },
        { href: "/hr/recruitment/approval-process", label: "สถานะการอนุมัติ" },
      ],
    },
  ];

  if (isAdmin(profile)) {
    groups.push({
      title: "ตั้งค่าระบบ",
      items: [
        { href: "/hr/settings/users", label: "ผู้ใช้งาน" },
        { href: "/hr/settings/departments", label: "แผนก & สายอนุมัติ" },
        { href: "/hr/settings/work-calendar", label: "ปฏิทินงาน & วันลา" },
        { href: "/hr/settings/email", label: "ตั้งค่าอีเมล" },
        { href: "/hr/settings/privacy-notice", label: "Privacy Notice" },
        { href: "/hr/settings/general", label: "ทั่วไป" },
      ],
    });
  }

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="fixed inset-y-0 flex w-60 flex-col overflow-y-auto bg-stone-900 p-4 text-white">
        <Link href="/hr" className="px-3 py-2 text-lg font-bold">
          {orgName}
          <span className="block text-xs font-normal text-stone-400">E-HR</span>
        </Link>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {groups.map((group, gi) => (
            <div key={gi} className={group.title ? "mt-3" : ""}>
              {group.title && (
                <p className="px-3 pb-1 text-xs font-medium uppercase text-stone-500">
                  {group.title}
                </p>
              )}
              {group.items.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-3 border-t border-stone-700 pt-3">
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
