import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ร่วมงานกับเรา | E-Recruitment",
  description: "ระบบรับสมัครงานออนไลน์",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ดึงสี Primary จาก settings แล้ว inject เป็นตัวแปร CSS --brand (มีผลทั้งเว็บ)
  const settings = await getSettings(["primary_color"]);
  const primaryColor = settings.primary_color as string | undefined;
  const brandStyle = primaryColor
    ? ({ "--brand": primaryColor } as CSSProperties)
    : undefined;

  return (
    <html lang="th" className={`${notoThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans" style={brandStyle}>
        {children}
      </body>
    </html>
  );
}
