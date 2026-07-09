import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // ฟอร์มสมัครส่งไฟล์ CV + รูปถ่ายผ่าน server action
      bodySizeLimit: "12mb",
    },
  },
  // recruitment ย้ายเป็นโมดูลใต้ /hr/recruitment/* — redirect URL เก่า (กันลิงก์ในอีเมลที่ส่งไปแล้วเสีย)
  async redirects() {
    return [
      { source: "/hr/jobs/:path*", destination: "/hr/recruitment/jobs/:path*", permanent: false },
      { source: "/hr/applications/:path*", destination: "/hr/recruitment/applications/:path*", permanent: false },
      { source: "/hr/approvals", destination: "/hr/recruitment/approvals", permanent: false },
      { source: "/hr/approval-process", destination: "/hr/recruitment/approval-process", permanent: false },
    ];
  },
};

export default nextConfig;
