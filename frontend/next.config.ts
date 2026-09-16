import type { NextConfig } from "next";
import path from "path"; // Tambahkan import ini

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  // Tambahkan konfigurasi Turbopack di bawah ini
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
