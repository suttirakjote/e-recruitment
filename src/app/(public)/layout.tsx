import Link from "next/link";
import { getBranding } from "@/lib/settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgName, logoUrl } = await getBranding();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold text-emerald-800">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={orgName} className="h-9 w-auto object-contain" />
            )}
            {orgName}
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link href="/jobs" className="hover:text-emerald-700">
              ตำแหน่งงาน
            </Link>
            <Link href="/track" className="hover:text-emerald-700">
              ติดตามสถานะ
            </Link>
            <Link
              href="/hr"
              className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-50"
            >
              สำหรับ HR
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-stone-500">
          <span>© {new Date().getFullYear()} {orgName}</span>
          <Link href="/privacy-notice" className="hover:text-emerald-700">
            ประกาศคุ้มครองข้อมูลส่วนบุคคล
          </Link>
        </div>
      </footer>
    </div>
  );
}
