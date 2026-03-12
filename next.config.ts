/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // ✅ HARDCODED: Your Render backend URL
    const apiUrl = 'https://aiasistsystembackend.onrender.com';

    console.log("API URL:", apiUrl);

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;