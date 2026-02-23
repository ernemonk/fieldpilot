import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Static export is only needed for the Firebase Hosting deployment (npm run build).
  // In development (next dev / Turbopack) these settings cause panics, so they are
  // applied exclusively during production builds.
  ...(isProd && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
