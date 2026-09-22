import type { NextConfig } from 'next';
import { basePath, target } from './lib/deploy';

// 目標由 lib/deploy.ts 判定（Vercel 建置自帶 VERCEL=1，其餘一律 GitHub Pages）。
// assetPrefix 不設：Next 會用 basePath 推，設了會變成雙重前綴。
console.log(`next.config: target=${target} basePath=${basePath || '(root)'}`);

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
