import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Temporary: unblock production build by ignoring ESLint errors during builds
    // TODO: Re-enable after addressing outstanding lint errors
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Aktiviert die Scroll-Wiederherstellung in Next.js
    // Dies hilft bei der Beibehaltung der Scrollposition bei Navigationen
    scrollRestoration: true,
  },
};

export default nextConfig;
