/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    DEFAULT_TIMEZONE: 'Asia/Taipei'
  }
};

export default nextConfig;
