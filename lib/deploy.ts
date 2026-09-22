import cfg from '../deploy.config.json';

// 同一份程式要出兩種靜態站：
//   pages  —— GitHub Pages，走 /gooaye-notes 子路徑（主人接好網域之前保持活著）
//   vercel —— Vercel，根路徑，網址由 Vercel 自己帶進來
// 目標不用手設：Vercel 建置時自己會有 VERCEL=1。本機開發預設 pages，
// 要本機模擬 Vercel 就 DEPLOY_TARGET=vercel npm run dev。
export type DeployTarget = 'pages' | 'vercel';

const env = (k: string): string | undefined => {
  const v = process.env[k];
  return v === undefined || v === '' ? undefined : v;
};

export const target: DeployTarget =
  (env('DEPLOY_TARGET') as DeployTarget | undefined) ?? (env('VERCEL') ? 'vercel' : 'pages');

/** 子路徑。Vercel 是根路徑，所以是空字串；Next 會自己用它推 assetPrefix，不要再設一次（會變成雙重前綴）。 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (target === 'vercel' ? cfg.vercel.basePath : cfg.pages.basePath);

// canonical／OG／sitemap 用的絕對網址。
// 主人接好網域之前，**Pages 仍然是正式站**（2026-09-23 01:24 拍），所以 Vercel 上的
// canonical 照樣指 Pages —— 兩個站內容一樣，不要讓搜尋引擎看到兩份自稱正式的副本。
// 網域接好之後只要在 Vercel 專案設 NEXT_PUBLIC_SITE_URL（不進 repo），整站跟著換。
export const siteUrl = env('NEXT_PUBLIC_SITE_URL') ?? cfg.pages.url;
