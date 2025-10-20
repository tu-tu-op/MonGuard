/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_RISK_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_RISK_REGISTRY_ADDRESS,
    NEXT_PUBLIC_COMPLIANCE_ORACLE_ADDRESS: process.env.NEXT_PUBLIC_COMPLIANCE_ORACLE_ADDRESS,
    NEXT_PUBLIC_TRANSACTION_MONITOR_ADDRESS: process.env.NEXT_PUBLIC_TRANSACTION_MONITOR_ADDRESS,
    NEXT_PUBLIC_ENFORCEMENT_ADDRESS: process.env.NEXT_PUBLIC_ENFORCEMENT_ADDRESS,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
