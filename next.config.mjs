// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: [
      '@reown/appkit', 
      'wagmi', 
      'viem', 
      'next-auth',
      '@tanstack/react-query'
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          'indexeddb': false,
          'crypto': false,
          'stream': false,
          'assert': false,
          'http': false,
          'https': false,
          'os': false,
          'url': false,
          'zlib': false,
        },
      }
    }

    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            wallet: {
              test: /[\\/]node_modules[\\/](@reown|wagmi|viem|@walletconnect)[\\/]/,
              name: 'wallet',
              chunks: 'all',
              priority: 20,
            },
            auth: {
              test: /[\\/]node_modules[\\/](next-auth)[\\/]/,
              name: 'auth',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      }
    }

    return config
  },
  // Remove swcMinify - it's deprecated in Next.js 15
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig
