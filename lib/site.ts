export const site = {
  name: '股癌筆記',
  tagline: '非官方 · AI 整理',
  description:
    '股癌 podcast 的每集重點筆記：提到哪幾檔個股、講在第幾分幾秒、可以直接跳著聽。非官方、非投資建議。',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryvn-dev.github.io/gooaye-notes',
  locale: 'zh-TW',
  contact: 'austenpsy@gmail.com',
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/gooaye-notes';
export const abs = (p: string) => `${site.url}${p.startsWith('/') ? p : `/${p}`}`;
