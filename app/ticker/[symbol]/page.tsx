import Link from 'next/link';
import type { Metadata } from 'next';
import type { FAQPage, BreadcrumbList, Corporation, WithContext } from 'schema-dts';
import { getTickers, getIndex, getPrices, findTicker, getTranscriptFacts, tickerSlug, STANCE, stancesOf } from '@/lib/content';
import PriceChart, { type Mark } from '@/components/PriceChart';
import PerfChip from '@/components/PerfChip';
import StanceIcon from '@/components/StanceIcon';
import { site, abs } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getTickers().tickers.map((t) => ({ symbol: tickerSlug(t.ticker) }));
}

const faqAnswer = (t: NonNullable<ReturnType<typeof findTicker>>) =>
  `${t.display_name}（${t.ticker.replace('TW:', '')}）在本站收錄的節目中出現於 ${t.episode_count} 集，` +
  `最早 ${t.first_seen}、最近一次 ${t.last_seen}。每一集的日期與當集立場標在價量圖上，` +
  `點集號可以回到那一集的原話與段落。本站只做紀錄，不提供買賣建議。`;

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params;
  const t = findTicker(symbol);
  if (!t) return {};
  const code = t.ticker.replace('TW:', '');
  const title = `${t.display_name} ${code}｜節目裡提到的每一次與當天股價`;
  const description = faqAnswer(t).slice(0, 155);
  const url = abs(`/ticker/${symbol}/`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: site.name,
      locale: 'zh_TW',
      images: [{ url: abs(`/og/ticker-${symbol}.png`), width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [abs(`/og/ticker-${symbol}.png`)] },
  };
}

export default async function TickerPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const t = findTicker(symbol);
  if (!t) return null;
  const idx = getIndex();
  const code = t.ticker.replace('TW:', '');
  const answer = faqAnswer(t);
  const prices = getPrices(t.ticker);
  const facts = getTranscriptFacts();
  const titleOf = new Map(idx.episodes.map((e) => [e.slug, e.site_title]));
  const hostOf = new Map(idx.episodes.map((e) => [e.slug, e.host]));
  // 同一集看多也看空的那幾集，之前被 stancesOf(r)[0] 砍成單一方向，圖上只剩一個箭頭，
  // 首頁 chip 卻是雙向 icon —— 兩邊對不起來。整串 stances 交給圖，讓它自己畫兩個箭頭。
  const marks: Mark[] = t.timeline.map((r) => ({
    date: r.published_at,
    stances: stancesOf(r),
    show: r.show_name ?? '股癌',
    speaker: r.speaker,
    perf: r.perf ?? null,
  }));

  const companyLd: WithContext<Corporation> = {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    name: t.display_name,
    tickerSymbol: code,
    url: abs(`/ticker/${symbol}/`),
    sameAs: t.yahoo_url,
    subjectOf: t.timeline.map((r) => ({
      '@type': 'PodcastEpisode' as const,
      name: `${r.show_name ?? '股癌'} EP${r.ep_number}`,
      datePublished: r.published_at,
      url: abs(`/p/${r.show ?? 'gooaye'}/${r.slug}/`),
    })),
  };
  const faqLd: WithContext<FAQPage> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `節目裡怎麼提到 ${t.display_name}（${code}）？`,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      },
      {
        '@type': 'Question',
        name: `${t.display_name} 出現在哪幾集？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: t.timeline
            .map((r) => `${r.show_name ?? '股癌'} EP${r.ep_number}（${r.published_at}，${STANCE[stancesOf(r)[0] ?? 'mentioned'].label}）`)
            .join('、') + `。收錄範圍 ${idx.coverage.from} 至 ${idx.coverage.to}。`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(companyLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />

      <h1 className="leading-tight">
        {t.display_name} <span className="font-mono text-lg text-[#767676]">{code}</span>
      </h1>

      {prices && prices.rows.length > 0 ? (
        <PriceChart bars={prices.rows} marks={marks} />
      ) : (
        <p className="mt-4 text-[15px] text-[#6b6b6b]">報價暫時抓不到。</p>
      )}

      <ul className="mt-6 divide-y divide-[#eee]">
        {t.timeline.map((r) => {
          const key = `${r.slug}|${t.ticker}`;
          const n = facts.perEpisode[key] ?? 0;
          const anchor = facts.anchor[key];
          const href = `/p/${r.show ?? 'gooaye'}/${r.slug}/`;
          return (
            <li key={r.slug} className="py-3">
              <div className="flex items-baseline gap-3">
                {/* 集名一律用 RSS 原標，不另外編一個名字。 */}
                <Link href={href} className="font-bold text-[#242424] no-underline">
                  {titleOf.get(r.slug) ?? `EP${r.ep_number}`}
                </Link>
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1">
                    {stancesOf(r).map((st) => (
                      <StanceIcon key={st} stance={st} p={r.jev_prob} />
                    ))}
                  </span>
                  {/* 提到之後的漲跌；抓不到就是「—」，不用 0 頂替。 */}
                  <PerfChip ticker={t.ticker} stance={stancesOf(r)[0] ?? 'mentioned'} perf={r.perf} head="perf" />
                </span>
              </div>
              <div className="mt-0.5 text-[13px] text-[#6b6b6b]">
                <time dateTime={r.published_at}>{r.published_at}</time> · {r.show_name ?? '股癌'}
                {hostOf.get(r.slug) ? ` · ${hostOf.get(r.slug)}` : ''}
                {n > 0 ? ` · ${n} 句` : ''}
              </div>
              {r.quote && (
                <p className="mt-1 truncate font-serif text-[14px] text-[#6b6b6b]">
                  {/* 跨頁又帶錨點的連結一律走 next/link：手寫 <a> 不會補 basePath，Pages 上就是 404。 */}
                  <Link href={anchor ? `${href}#${anchor}` : href} className="no-underline">
                    「{r.quote}」
                  </Link>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-[13px] text-[#6b6b6b]">
        <a href={t.yahoo_url} rel="noopener nofollow" className="underline underline-offset-2">
          Yahoo Finance 報價
        </a>
      </p>
    </>
  );
}
