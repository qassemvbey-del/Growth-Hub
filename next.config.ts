import type { NextConfig } from "next";

// const cspHeader = process.env.NODE_ENV === 'development'
//   ? `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
//   : `script-src 'self' 'unsafe-inline'`;

const cspHeader = process.env.NODE_ENV === 'development'
  ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://accounts.google.com`
  : `script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com`;

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.0.13.95'],
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
    ]
  }
};

export default nextConfig;
