const path = require('path');
const browserPino = require.resolve('pino/browser');
const noopModule = path.resolve(__dirname, 'stubs/pino-noop.js');

const pinoBrowserAliases = {
  // Force Turbopack/Webpack to use browser-safe shims
  pino: browserPino,
  'pino/browser': browserPino,
  'pino-pretty': noopModule,
  'pino-std-serializers': noopModule,
  'thread-stream': noopModule,
  'sonic-boom': noopModule,
};

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://auth.privy.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.postimg.cc https://auth.privy.io https://ipfs.io https://gateway.pinata.cloud https://*.pinata.cloud https://*.mypinata.cloud",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self' http://localhost:5173 http://localhost:3003 https://sovseas.xyz https://www.sovseas.xyz",
  "child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org",
  "frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com",
  "connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://selfauth.vercel.app https://celo-alfajores.drpc.org https://celo.drpc.org",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: '*.pinata.cloud',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'inner-salmon-leopard.myfilebase.com',
        pathname: '/ipfs/**',
      },
    ],
  },
  transpilePackages: [
    '@reown/walletkit',
    '@privy-io/react-auth',
    '@privy-io/wagmi',
    '@selfxyz/core',
    '@selfxyz/qrcode',
    '@walletconnect/react-native-compat',
  ],
  webpack: (config, { isServer }) => {
    // Fix for Buffer and other Node.js polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Add Buffer polyfill
    config.resolve.alias = {
      ...config.resolve.alias,
      buffer: require.resolve('buffer'),
      ...pinoBrowserAliases,
    };

    config.plugins.push(
      new (require('webpack')).ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      })
    );

    return config;
  },
  // Enable experimental features if needed
  experimental: {
    // Add experimental toggles here when needed
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

