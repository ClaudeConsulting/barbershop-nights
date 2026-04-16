/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.barbershoptags.com' },
      { protocol: 'https', hostname: 'barbershoptags.com' },
    ],
  },
};

export default nextConfig;
