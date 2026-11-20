/** @type {import('next').NextConfig} */
const nextConfig = {
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
