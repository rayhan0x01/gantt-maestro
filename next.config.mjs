/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === "production"
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
  output: "export",
  basePath: isProduction ? "/gantt-maestro" : "",
}

export default nextConfig
