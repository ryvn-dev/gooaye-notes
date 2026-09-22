import { siteUrl } from './deploy';

export const site = {
  name: '股癌筆記',
  tagline: '非官方個人筆記',
  description:
    '股癌 Podcast 逐字稿與個人筆記：每一集的重點、相關個股與看多看空、原話與可跳播的段落，手機上讀完一集。',
  keywords: [
    '股癌',
    '股癌 Podcast',
    '股癌逐字稿',
    '股癌筆記',
    '股癌重點整理',
    '股癌重點',
    '每集提到的個股',
    '看多看空',
    '時間碼',
    '個人筆記',
  ],
  url: siteUrl,
  locale: 'zh-TW',
  // 2026-09-23 01:39 拍：先不放廣告。版位元件留著（之後要接回來不必重畫版面），
  // 但這一格是 false 就一個位元組的第三方程式碼都不載。
  ads: false,
  contact: 'austenpsy@gmail.com',
} as const;

export { basePath, target } from './deploy';
export const abs = (p: string) => `${site.url}${p.startsWith('/') ? p : `/${p}`}`;
