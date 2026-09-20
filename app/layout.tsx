import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { site, abs } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}｜${site.tagline}`, template: `%s｜${site.name}` },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'zh_TW',
    url: abs('/'),
    title: `${site.name}｜${site.tagline}`,
    description: site.description,
  },
  twitter: { card: 'summary', title: `${site.name}｜${site.tagline}`, description: site.description },
  robots: { index: true, follow: true },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <body className="bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <header className="border-b border-slate-200 dark:border-slate-800">
          <div className="mx-auto flex max-w-[680px] items-baseline gap-3 px-4 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              {site.name}
            </Link>
            <span className="text-sm text-slate-500 dark:text-slate-400">{site.tagline}</span>
            <nav className="ml-auto text-[15px]">
              <Link href="/search/" className="hover:underline">
                搜尋
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[680px] px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-[680px] px-4 pb-12 pt-4 text-sm text-slate-500 dark:text-slate-400">
          <p>
            {site.name} · 非官方第三方整理 · 不構成投資建議 ·{' '}
            <Link href="/ticker/" className="underline underline-offset-2">
              個股
            </Link>{' '}
            ·{' '}
            <Link href="/about/" className="underline underline-offset-2">
              聲明與聯絡
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
