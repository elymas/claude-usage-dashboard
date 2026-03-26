/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
  transpilePackages: ["@tremor/react"],
};

module.exports = nextConfig;
