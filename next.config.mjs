/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "mammoth",
    "pdf-parse",
    "tesseract.js",
    "word-extractor",
    "@langfuse/tracing",
    "@langfuse/otel",
    "@opentelemetry/sdk-node"
  ]
};

export default nextConfig;
