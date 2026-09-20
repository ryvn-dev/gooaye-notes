import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import { site, abs } from '@/lib/site';
import { huninn } from '@/lib/fonts';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s｜${site.name}` },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'zh_TW',
    url: abs('/'),
    title: site.name,
    description: site.description,
  },
  twitter: { card: 'summary', title: site.name, description: site.description },
  keywords: [...site.keywords],
  robots: { index: true, follow: true },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light' as const,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW" className={huninn.variable}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: site.name,
              url: abs('/'),
              description: site.description,
              inLanguage: 'zh-Hant-TW',
            }),
          }}
        />
        <main className="mx-auto max-w-[680px] px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-[680px] px-4 pb-28 pt-4 text-sm text-[#6b6b6b]">
          <p>
            {site.name} · 非官方第三方整理 · 地端 AI 模型與站主自我判斷，仍有可能出錯。非投資建議。{' '}
            <Link href="/ticker/" className="underline underline-offset-2">
              個股
            </Link>{' '}
            ·{' '}
            <Link href="/about/" className="underline underline-offset-2">
              聲明與聯絡
            </Link>
          </p>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
