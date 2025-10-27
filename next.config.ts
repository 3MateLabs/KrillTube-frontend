import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aggregator.walrus-testnet.walrus.space',
        pathname: '/v1/blobs/**',
      },
      {
        protocol: 'https',
        hostname: 'aggregator.walrus.space',
        pathname: '/v1/blobs/**',
      },
    ],
    // Increase timeout for slow Walrus responses
    minimumCacheTTL: 60,
    // Allow unoptimized images from Walrus (handled in components)
    unoptimized: false,
  },
};

export default nextConfig;
