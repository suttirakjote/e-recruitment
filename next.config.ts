import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // ฟอร์มสมัครส่งไฟล์ CV + รูปถ่ายผ่าน server action
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
