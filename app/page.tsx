import Link from 'next/link';
import type { Metadata } from 'next';
import { getIndex, getTickers, minutes, tickerSlug } from '@/lib/content';
import TickerChip from '@/components/TickerChip';
import AdSlot from '@/components/AdSlot';
import Disclaimer from '@/components/Disclaimer';
import { site, abs } from '@/lib/site';

export const metadata: Metadata = {
  title: `股癌 重點筆記｜每集提到哪幾檔、講在第幾分鐘`,
  description: site.description,
  alternates: { canonical: abs('/') },
};

export default function Home() {
  const idx = getIndex();
  const { tickers, ticker_count } = getTickers();
  const hot = tickers.slice(0, 12);
  const latest = idx.episodes[0];

  return (
    <>
      <section className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
        <h1 className="text-2xl font-bold leading-snug">股癌 每集重點筆記與個股提及紀錄</h1>
        <p className="mt-2">
          這裡收錄股癌 podcast <strong>EP{Number(idx.episodes[idx.episodes.length - 1].slug)}–EP
          {Number(latest.slug)}</strong> 共 {idx.episode_count} 集（{idx.coverage.from} 至 {idx.coverage.to}）：
          每一集提到哪幾檔個股、提到幾次、第一次講在第幾分幾秒，點時間碼可以直接跳著聽。
          目前收錄 {ticker_count} 檔個股，每檔一頁、看得到歷次被提到的時間線。
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          [observed] 提及次數與時間碼由程式從公開音檔的自動轉寫抽出。
          [尚未產出] 每集的重點整理與多空立場判讀還沒上線，站上不會先放一段猜的。
        </p>
      </section>

      <AdSlot id="home-below-fold" />

      <h2 className="mt-8 text-lg font-bold">最新集數</h2>
      <ul className="mt-3 space-y-3">
        {idx.episodes.map((e) => (
          <li key={e.slug}>
            <article className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600">
              <Link href={`/gooaye/${e.slug}/`} className="block">
                <div className="flex items-baseline gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">EP{Number(e.slug)}</span>
                  <time dateTime={e.published_at}>{e.published_at}</time>
                  <span>{minutes(e.duration_s)} 分鐘</span>
                </div>
                <h3 className="mt-1 text-lg font-semibold">{e.site_title}</h3>
                <p className="mt-1 text-[15px] text-slate-600 dark:text-slate-300">
                  {e.top_tickers.length > 0
                    ? `本集抽到 ${e.mention_total} 檔個股，提到最多次的是 ${e.top_tickers[0].display_name}。`
                    : '本集沒有抽到任何個股代號。'}
                </p>
              </Link>
              {e.top_tickers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {e.top_tickers.map((t) => (
                    <TickerChip key={t.ticker} ticker={t.ticker} name={t.display_name} stance={t.stance} />
                  ))}
                </div>
              )}
            </article>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-bold">被提到最多集的個股</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        樣本 n={idx.episode_count} 集（{idx.coverage.from} 起算），<strong>樣本不足</strong>，不足以談任何準確率。
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {hot.map((t) => (
          <li key={t.ticker}>
            <Link
              href={`/ticker/${tickerSlug(t.ticker)}/`}
              className="inline-flex items-baseline gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-[15px] hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <span className="font-medium">{t.display_name}</span>
              <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">{t.episode_count} 集</span>
            </Link>
          </li>
        ))}
      </ul>

      <Disclaimer />
    </>
  );
}
