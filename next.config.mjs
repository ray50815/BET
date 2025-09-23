/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true
  },
  reactStrictMode: true,
  output: 'standalone',
  env: {
    DEFAULT_TIMEZONE: 'Asia/Taipei'
  }
};

export default nextConfig;
