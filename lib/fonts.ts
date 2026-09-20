import localFont from 'next/font/local';

// jf open 粉圓（jf-openhuninn），SIL OFL 1.1，已子集化為常用字。
export const huninn = localFont({
  src: '../public/fonts/huninn-subset.woff2',
  display: 'swap',
  weight: '400',
  variable: '--font-huninn',
  fallback: ['Noto Sans TC', 'PingFang TC', 'system-ui', 'sans-serif'],
});
