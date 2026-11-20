/** @type {import('next').NextConfig} */
const nextConfig = {
  // e2e builds into its own folder so it never clobbers a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Vercel builds point at Arc testnet by default; local builds keep the local chain.
  env: { NEXT_PUBLIC_CHAIN: process.env.NEXT_PUBLIC_CHAIN ?? (process.env.VERCEL ? "arc" : "local") },
  transpilePackages: ["@boats/sdk"],
  webpack(config) {
    // The SDK is TypeScript source with ESM ".js" import specifiers.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
};
export default nextConfig;
