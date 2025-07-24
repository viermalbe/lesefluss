import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Aktiviert die Scroll-Wiederherstellung in Next.js
    // Dies hilft bei der Beibehaltung der Scrollposition bei Navigationen
    scrollRestoration: true,
  },
};

export default nextConfig;
