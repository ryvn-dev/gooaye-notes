import Link from 'next/link';
import type { Metadata } from 'next';
import { getIndex, getTickers, minutes, tickerSlug } from '@/lib/content';
import StanceTagRow from '@/components/StanceTagRow';
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
      <section>
        <h1 className="text-2xl font-bold leading-snug">股癌 每集重點筆記與個股提及紀錄</h1>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
          <div className="flex gap-1">
            <dt className="text-slate-500 dark:text-slate-400">收錄集數</dt>
            <dd className="font-semibold tabular-nums">
              {idx.episode_count}（EP{Number(idx.episodes[idx.episodes.length - 1].slug)}–EP{Number(latest.slug)}）
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-slate-500 dark:text-slate-400">期間</dt>
            <dd className="font-semibold tabular-nums">
              {idx.coverage.from} 至 {idx.coverage.to}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-slate-500 dark:text-slate-400">個股</dt>
            <dd className="font-semibold tabular-nums">{ticker_count}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          [observed] 提及次數與時間碼來自自動轉寫。立場判讀與 AI 摘要未產出時一律顯示「待補」。
        </p>
      </section>

      <AdSlot id="home-below-fold" />

      <h2 className="mt-8 text-lg font-bold">最新集數</h2>
      <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
        {idx.episodes.map((e) => (
          <li key={e.slug}>
            <article className="py-5">
              <Link href={`/gooaye/${e.slug}/`} className="block">
                <div className="flex items-center gap-2 text-sm text-[#6b6b6b] dark:text-[#a3a3a3]">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                    股
                  </span>
                  <span>主持人</span>
                  <span>·</span>
                  <time dateTime={e.published_at}>{e.published_at}</time>
                </div>
                <h3 className="mt-1 text-[20px] font-bold leading-snug">{e.site_title}</h3>
                <p className="mt-1 text-[16px] text-[#6b6b6b] dark:text-[#a3a3a3]">
                  {e.summary_answer_first ?? '一句摘要待補'}
                </p>
                <p className="mt-2 text-sm text-[#6b6b6b] dark:text-[#a3a3a3]">
                  提及 {e.mention_total} 檔 · {minutes(e.duration_s)} 分鐘
                </p>
              </Link>
              <div className="mt-2">
                <StanceTagRow items={e.top_tickers} />
              </div>
            </article>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-bold">被提到最多集的個股</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        樣本 n={idx.episode_count} 集，起算日 {idx.coverage.from}，<strong>樣本不足</strong>。
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {hot.map((t) => (
          <li key={t.ticker}>
            <Link
              href={`/ticker/${tickerSlug(t.ticker)}/`}
              className="inline-flex items-baseline gap-1.5 border border-slate-300 px-3 py-1.5 text-[15px] hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
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
