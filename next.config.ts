/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Remove trailing slash if present
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

    console.log("API URL:", apiUrl);  // For debugging

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,  // ✅ Correct
      },
    ];
  },
};

module.exports = nextConfig;