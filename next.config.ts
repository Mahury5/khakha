import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export',  <-- Remove or comment out this line
  images: {
    unoptimized: true, 
  },
};

export default nextConfig;