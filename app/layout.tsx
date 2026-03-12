/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Use a default value that works for both local and production
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.startsWith('http') 
      ? process.env.NEXT_PUBLIC_API_URL 
      : 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;