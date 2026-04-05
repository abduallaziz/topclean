/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // سيقوم هذا الخيار بتجاهل أخطاء TypeScript أثناء الـ Build
    ignoreBuildErrors: true,
  },
  eslint: {
    // سيقوم هذا الخيار بتجاهل أخطاء ESLint أيضاً لضمان سرعة الرفع
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
};

module.exports = nextConfig;

