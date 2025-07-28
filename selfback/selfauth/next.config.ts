import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Global CORS headers - allow all origins
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
  
  // Ignore build errors for specific modules
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  
  // Ignore ESLint errors during build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Configure webpack to handle CommonJS modules and ignore specific warnings
  webpack: (config, { isServer }) => {
    // Handle CommonJS modules that don't support named exports
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // Ignore specific module warnings and errors
    config.ignoreWarnings = [
      /Failed to parse source map/,
      /CommonJS modules can always be imported via the default export/,
      // Ignore SSR-related warnings for @selfxyz/qrcode
      /ReferenceError: document is not defined/,
      /ReferenceError: window is not defined/,
      /document is not defined/,
      /window is not defined/,
      /@selfxyz\/qrcode/,
      /SelfQRcodeWrapper/,
      // Ignore react-spinners CommonJS issues (dependency of @selfxyz/qrcode)
      /Named export 'BounceLoader' not found/,
      /The requested module 'react-spinners' is a CommonJS module/,
      /which may not support all module.exports as named exports/,
    ];
    
    // Handle @selfxyz/qrcode SSR issues
    if (isServer) {
      config.externals.push('@selfxyz/qrcode');
    }
    
    return config;
  },
  
  // Suppress build output warnings
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Additional build optimizations
  experimental: {
    // Add any valid experimental features here if needed
  },
  
  // Suppress console output during build
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
