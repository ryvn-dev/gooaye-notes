import Link from 'next/link';
import type { Metadata } from 'next';
import { getIndex, getTickers, tickerSlug } from '@/lib/content';
import Disclaimer from '@/components/Disclaimer';
import { abs } from '@/lib/site';

export const metadata: Metadata = {
  title: '股癌提到過哪些個股｜個股索引',
  description: '股癌 podcast 被提到過的個股索引：每一檔一頁，看得到歷次被提到的集數、次數與時間碼。非官方整理，非投資建議。',
  alternates: { canonical: abs('/ticker/') },
};

export default function TickerIndex() {
  const { tickers, ticker_count } = getTickers();
  const idx = getIndex();
  const us = tickers.filter((t) => t.market === 'US');
  const tw = tickers.filter((t) => t.market === 'TW');

  const group = (title: string, rows: typeof tickers) => (
    <section className="mt-8">
      <h2 className="">{title}（{rows.length} 檔）</h2>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
        {rows.map((t) => (
          <li key={t.ticker} className="flex items-baseline gap-2 py-2.5">
            <Link href={`/ticker/${tickerSlug(t.ticker)}/`} className="font-medium underline underline-offset-2">
              {t.display_name}
            </Link>
            <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{t.ticker.replace('TW:', '')}</span>
            <span className="ml-auto text-sm text-slate-500 tabular-nums dark:text-slate-400">
              {t.episode_count} 集 · {t.mention_total} 次
            </span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <h1 className="">股癌提到過的個股</h1>
      <p className="mt-2">
        共 {ticker_count} 檔，來自 {idx.episode_count} 集節目（{idx.coverage.from} 至 {idx.coverage.to}）。
        點進去可以看到這一檔歷次被提到的集數、次數與時間碼。
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        [observed] 由自動轉寫抽取，樣本 n={idx.episode_count} 集、<strong>樣本不足</strong>；
        疑似誤抓的代號已擋在個股頁之外，只留在該集頁的「待人工確認」區。
      </p>
      {group('美股', us)}
      {group('台股', tw)}
      <Disclaimer />
    </>
  );
}
