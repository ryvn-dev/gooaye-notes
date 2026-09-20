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
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryvn-dev.github.io/gooaye-notes',
  locale: 'zh-TW',
  contact: 'austenpsy@gmail.com',
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/gooaye-notes';
export const abs = (p: string) => `${site.url}${p.startsWith('/') ? p : `/${p}`}`;
