import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import { getShows } from '@/lib/content';
import { site, abs } from '@/lib/site';
import { huninn } from '@/lib/fonts';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s - ${site.name}` },
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
        <div id="site-bar" className="fixed inset-x-0 top-0 z-40 h-12 border-b border-[#e5e5e5] bg-white">
          <div className="mx-auto flex h-full max-w-[680px] items-center px-4">
            <Link href="/" className="text-[20px] font-bold tracking-tight text-[#242424]">
              {site.name}
            </Link>
          </div>
        </div>
        <main className="mx-auto max-w-[680px] px-4 pt-6 pb-[72px]">{children}</main>
        <footer className="mx-auto max-w-[680px] px-4 pb-28 pt-4 text-sm text-[#6b6b6b]">
          <p>地端 AI 模型與站主自我判斷，仍有可能出錯。非投資建議。</p>
          <p className="mt-1">
            {/* 節目來源讀 shows.json，不寫死某一個節目的網址（加第二個節目時這裡不用改）。 */}
            節目來源：
            {getShows()
              .shows.filter((s) => s.ingested)
              .map((s, i) => (
                <span key={s.id}>
                  {i > 0 && '、'}
                  <a href={s.site} className="underline underline-offset-2" rel="noopener">
                    {s.name}
                  </a>
                  {s.host && ` · ${s.host}`}
                </span>
              ))}{' '}
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
