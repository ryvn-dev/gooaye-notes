export const site = {
  name: '股癌筆記',
  tagline: '非官方 · AI 整理',
  description:
    '股癌 Podcast 逐字稿與個人筆記：AI 重點整理、每集提到的個股與看多看空、原話與時間碼，手機上直接跳著聽。',
  keywords: [
    '股癌',
    '股癌 Podcast',
    '股癌逐字稿',
    '股癌筆記',
    '股癌重點整理',
    'AI 重點整理',
    '每集提到的個股',
    '看多看空',
    '時間碼',
    '個人筆記',
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryvn-dev.github.io/gooaye-notes',
  locale: 'zh-TW',
  contact: 'austenpsy@gmail.com',
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/gooaye-notes';
export const abs = (p: string) => `${site.url}${p.startsWith('/') ? p : `/${p}`}`;
