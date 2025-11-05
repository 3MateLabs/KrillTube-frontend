import type { NextConfig } from "next";

// WasmChunksFixPlugin - Fixes WASM file paths in Next.js build
class WasmChunksFixPlugin {
  apply(compiler: any) {
    compiler.hooks.thisCompilation.tap("WasmChunksFixPlugin", (compilation: any) => {
      compilation.hooks.processAssets.tap(
        { name: "WasmChunksFixPlugin" },
        (assets: any) =>
          Object.entries(assets).forEach(([pathname, source]) => {
            if (!pathname.match(/\.wasm$/)) return;
            compilation.deleteAsset(pathname);

            const name = pathname.split("/")[1];
            const info = compilation.assetsInfo.get(pathname);
            compilation.emitAsset(name, source, info);
          })
      );
    });
  }
}

const nextConfig: NextConfig = {
  // Allow unsafe-eval for WASM (needed by Walrus SDK and ffmpeg.wasm)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; worker-src 'self' blob:; child-src 'self' blob:;",
          },
          // OPTIONAL: Enable for multi-threaded FFmpeg.wasm (2-4x faster transcoding)
          // Requires using @ffmpeg/core-mt instead of @ffmpeg/core
          // Uncomment these two headers to enable:
          // {
          //   key: 'Cross-Origin-Opener-Policy',
          //   value: 'same-origin',
          // },
          // {
          //   key: 'Cross-Origin-Embedder-Policy',
          //   value: 'require-corp',
          // },
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
  webpack: (config, { isServer, dev }) => {
    // Add WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Configure WASM output path
    if (isServer) {
      config.output.webassemblyModuleFilename = dev
        ? "static/wasm/[modulehash].wasm"
        : "chunks/[id].wasm";

      // Add fix plugin for production builds
      if (!dev) {
        config.plugins.push(new WasmChunksFixPlugin());
      }
    }

    // Ignore WASM resolution errors
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'wbg': false,
    };

    return config;
  },
};

export default nextConfig;
