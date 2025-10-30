import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow unsafe-eval for WASM (needed by Walrus SDK)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
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
  // Enable WASM support for Walrus SDK
  webpack: (config, { isServer }) => {
    // Add WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Ignore WASM resolution errors
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'wbg': false,
    };

    // Handle .wasm files as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name].[hash][ext]',
      },
    });

    return config;
  },
};

export default nextConfig;
