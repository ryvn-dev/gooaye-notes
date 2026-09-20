import Link from 'next/link';
import type { Metadata } from 'next';
import type { FAQPage, BreadcrumbList, WithContext } from 'schema-dts';
import { getTickers, getIndex, findTicker, tickerSlug, STANCE, STANCE_ORDER, stancesOf } from '@/lib/content';
import TickerChart, { type Point } from '@/components/TickerChart';
import Disclaimer from '@/components/Disclaimer';
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
  const points: Point[] = [...t.timeline].reverse().map((r) => ({
    ep: r.ep_number,
    date: r.published_at,
    count: r.mention_count,
    stance: stancesOf(r)[0] ?? 'mentioned',
    stanceLabel: STANCE[stancesOf(r)[0] ?? 'mentioned'].label,
    jev: r.jev_prob,
  }));

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
        {t.display_name} <span className="font-mono text-lg text-[#6b6b6b]">{code}</span>
      </h1>
      <p className="mt-1 text-sm">
        <a href={t.yahoo_url} rel="noopener nofollow" className="underline underline-offset-2">
          Yahoo Finance
        </a>
      </p>

      <div className="mt-6">
        <TickerChart data={points} />
      </div>
      <p className="mt-1 text-sm text-[#6b6b6b] dark:text-[#a3a3a3]">
        n={t.episode_count} 集 · 起算 {t.first_seen} · 長條＝該集提及次數，顏色＝立場，黑點＝Jev 機率
        {points.filter((p) => p.count === null).length > 0 &&
          `（${points.filter((p) => p.count === null).length} 集的次數待補，圖上沒有長條）`}
      </p>

      <ul className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
        {t.timeline.map((r) => (
          <li key={r.slug} className="flex flex-wrap items-center gap-x-3 py-2.5 text-[15px]">
            <Link href={`/gooaye/${r.slug}/`} className="font-semibold underline underline-offset-2">
              EP{r.ep_number}
            </Link>
            <time dateTime={r.published_at} className="text-sm">
              {r.published_at}
            </time>
            <span className="ml-auto flex flex-wrap gap-1">
              {stancesOf(r).map((st) => (
                <span key={st} className={`rounded-full px-2 py-0.5 text-[13px] ${STANCE[st].cls}`}>
                  {STANCE[st].label}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <Disclaimer />
    </>
  );
}
