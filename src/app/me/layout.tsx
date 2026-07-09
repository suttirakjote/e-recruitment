import Link from "next/link";
import { getProfile, isHrPortalUser } from "@/lib/auth";
import { getOrgName } from "@/lib/settings";
import { Avatar } from "@/components/hr/avatar";
import { SignOutButton } from "@/components/hr/sign-out-button";

export default async function EssLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, orgName] = await Promise.all([getProfile(), getOrgName()]);

  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/me" className="text-lg font-bold text-emerald-800">
            {orgName}
            <span className="ml-2 text-xs font-normal text-stone-400">พนักงาน</span>
          </Link>
          <div className="flex items-center gap-4">
            {profile && isHrPortalUser(profile) && (
              <Link href="/hr" className="text-sm text-stone-500 hover:text-emerald-700">
                ไปหน้า HR →
              </Link>
            )}
            {profile && (
              <div className="flex items-center gap-2">
                <Avatar photoPath={profile.photo_path} name={profile.full_name} size={32} />
                <span className="text-sm font-medium text-stone-700">{profile.full_name}</span>
              </div>
            )}
            <div className="w-24 rounded-lg bg-stone-900 text-center">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl gap-1 px-4">
          {[
            { href: "/me", label: "ข้อมูลฉัน" },
            { href: "/me/attendance", label: "ลงเวลา" },
            { href: "/me/documents", label: "เอกสารของฉัน" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-stone-600 hover:border-emerald-600 hover:text-emerald-700"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
