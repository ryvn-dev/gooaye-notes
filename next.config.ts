import type { NextConfig } from 'next';

// GitHub Pages 走 /gooaye-notes 子路徑；本機開發把 NEXT_PUBLIC_BASE_PATH 設成空字串即可。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/gooaye-notes';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
