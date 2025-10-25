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
  },
};

export default nextConfig;
