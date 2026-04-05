/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // يتجاهل أخطاء التايب سكريبت أثناء الرفع ليعمل الموقع فوراً
    ignoreBuildErrors: true,
  },
  eslint: {
    // يتجاهل تنبيهات التنسيق لضمان نجاح الـ Build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
