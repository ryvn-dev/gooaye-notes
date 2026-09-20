import Link from 'next/link';
import type { Metadata } from 'next';
import type { FAQPage, BreadcrumbList, WithContext } from 'schema-dts';
import { getTickers, getIndex, findTicker, tickerSlug, mmss, pct, speakerLabel, STANCE, STANCE_ORDER, stancesOf } from '@/lib/content';
import StanceTagRow from '@/components/StanceTagRow';
import Disclaimer from '@/components/Disclaimer';
import AdSlot from '@/components/AdSlot';
import { site, abs } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getTickers().tickers.map((t) => ({ symbol: tickerSlug(t.ticker) }));
}

const faqAnswer = (t: NonNullable<ReturnType<typeof findTicker>>, episodes: number) =>
  `本站紀錄到 ${t.display_name}（${t.ticker.replace('TW:', '')}）在 ${t.episode_count} 集股癌節目中被提到，合計 ${t.mention_total} 次，` +
  `最早 ${t.first_seen}、最近一次是 EP${t.timeline[0].ep_number}（${t.last_seen}）。` +
  `本站 v1 只紀錄「有沒有提到、提到幾次、講在第幾分幾秒」，還沒有產出多空立場判讀；` +
  `樣本 n=${episodes} 集，樣本不足，不提供任何勝率或報酬統計。`;

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const t = findTicker(symbol);
  if (!t) return {};
  const code = t.ticker.replace('TW:', '');
  const title = `股癌提到 ${t.display_name}（${code}）幾次？歷次提及與時間碼`;
  const description = faqAnswer(t, getIndex().episode_count).slice(0, 155);
  const url = abs(`/ticker/${symbol}/`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title, description, siteName: site.name, locale: 'zh_TW' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TickerPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const t = findTicker(symbol);
  if (!t) return null;
  const idx = getIndex();
  const code = t.ticker.replace('TW:', '');
  const answer = faqAnswer(t, idx.episode_count);

  const faqLd: WithContext<FAQPage> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `股癌最近怎麼看 ${t.display_name}（${code}）？`,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      },
      {
        '@type': 'Question',
        name: `股癌提到 ${t.display_name} 幾次？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${t.episode_count} 集、合計 ${t.mention_total} 次（${idx.coverage.from} 至 ${idx.coverage.to}，n=${idx.episode_count} 集）。`,
        },
      },
    ],
  };
  const crumbLd: WithContext<BreadcrumbList> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.name, item: abs('/') },
      { '@type': 'ListItem', position: 2, name: '個股', item: abs('/ticker/') },
      { '@type': 'ListItem', position: 3, name: t.display_name, item: abs(`/ticker/${symbol}/`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />

      <nav className="text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="underline underline-offset-2">{site.name}</Link>
        <span className="mx-1">/</span>
        <Link href="/ticker/" className="underline underline-offset-2">個股</Link>
      </nav>

      <h1 className="mt-2">
        {t.display_name} <span className="font-mono text-lg text-slate-500 dark:text-slate-400">{code}</span>
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        <a href={t.yahoo_url} rel="noopener nofollow" className="underline underline-offset-2">
          Yahoo Finance 報價
        </a>
      </p>

      <section className="mt-4">
        <h2 className="">股癌最近怎麼看 {t.display_name}？</h2>
        <p className="mt-1">{answer}</p>
      </section>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['被提到集數', `${t.episode_count}`],
          ['提及總次數', `${t.mention_total}`],
          ['最早', t.first_seen],
          ['最近', t.last_seen],
        ].map(([k, v]) => (
          <div key={k} className="border border-slate-200 p-3 dark:border-slate-800">
            <dt className="text-sm text-slate-500 dark:text-slate-400">{k}</dt>
            <dd className="text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        樣本 n={idx.episode_count} 集，起算日 {idx.coverage.from}。<strong>樣本不足</strong>。
      </p>

      <AdSlot id="ticker-below-timeline" />

      <h2 className="mt-8">哪幾集看多、哪幾集看空</h2>
      <ul className="mt-2 space-y-2">
        {STANCE_ORDER.map((st) => {
          const rows = t.timeline.filter((r) => stancesOf(r).includes(st));
          return (
            <li key={st} className="flex flex-wrap items-baseline gap-2">
              <span className={`rounded-full px-2 py-0.5 text-sm ${STANCE[st].cls}`}>{STANCE[st].label}</span>
              <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{rows.length} 集</span>
              {rows.map((r) => (
                <Link key={r.slug} href={`/gooaye/${r.slug}/`} className="text-[15px] underline underline-offset-2">
                  EP{r.ep_number}
                </Link>
              ))}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8">提及時間線</h2>
      <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
        {t.timeline.map((r) => (
          <li key={r.slug} className="py-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Link href={`/gooaye/${r.slug}/`} className="font-semibold underline underline-offset-2">
                EP{r.ep_number}
              </Link>
              <time dateTime={r.published_at} className="text-sm text-slate-500 dark:text-slate-400">
                {r.published_at}
              </time>
              <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{mmss(r.first_ts_s)} 起</span>
              {r.mention_count !== null && (
                <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">{r.mention_count} 次</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {stancesOf(r).map((s) => (
                <span key={s} className={`rounded-full px-2 py-0.5 text-sm ${STANCE[s].cls}`}>
                  {STANCE[s].label}
                </span>
              ))}
              <span className="text-sm text-slate-500 dark:text-slate-400">{speakerLabel(r.speaker)}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Jev 讀法 {r.jev_prob === null ? '—' : `${Math.round(r.jev_prob * 100)}%`}
              </span>
            </div>
            <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300">
              {r.quote ? `「${r.quote.slice(0, 60)}」` : '原話待補'}
            </p>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              {(['px_1d', 'px_5d', 'px_21d'] as const).map((k, i) => (
                <div key={k} className="flex gap-1 whitespace-nowrap">
                  <dt>提到後 {[1, 5, 21][i]} 日</dt>
                  <dd className="font-mono tabular-nums">{r[k] === null ? '待補' : pct(r[k])}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <Disclaimer />
    </>
  );
}
