/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // ✅ CORRECT - NO SPACE AT ALL
    const apiUrl = 'https://aiasistsystembackend.onrender.com';

    // Debug: Use JSON.stringify to see any hidden spaces
    console.log("API URL:", JSON.stringify(apiUrl));
    console.log("Destination:", JSON.stringify(`${apiUrl}/api/:path*`));

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;