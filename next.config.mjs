/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "mammoth",
    "pdf-parse",
    "tesseract.js",
    "word-extractor"
  ]
};

export default nextConfig;
