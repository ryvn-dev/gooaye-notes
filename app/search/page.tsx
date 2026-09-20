import type { Metadata } from 'next';
import { getIndex, getTickers, tickerSlug } from '@/lib/content';
import SearchClient, { type SearchDoc } from '@/components/SearchClient';
import Disclaimer from '@/components/Disclaimer';
import { abs } from '@/lib/site';

export const metadata: Metadata = {
  title: '搜尋集數與個股',
  description: '在股癌筆記裡搜尋集數與個股：輸入集號、公司名或代號，找到那一集與時間碼。',
  alternates: { canonical: abs('/search/') },
};

export default function SearchPage() {
  const idx = getIndex();
  const { tickers } = getTickers();

  const docs: SearchDoc[] = [
    ...idx.episodes.map((e) => ({
      kind: 'episode' as const,
      href: `/gooaye/${e.slug}/`,
      title: `股癌 EP${e.ep_number} 重點筆記`,
      sub: `${e.published_at} · 抽到 ${e.mention_total} 檔 · ${e.top_tickers.map((t) => t.display_name).join('、')}`,
      keywords: `EP${e.ep_number} ${e.published_at} ${e.top_tickers.map((t) => `${t.ticker} ${t.display_name}`).join(' ')}`,
    })),
    ...tickers.map((t) => ({
      kind: 'ticker' as const,
      href: `/ticker/${tickerSlug(t.ticker)}/`,
      title: `${t.display_name}（${t.ticker.replace('TW:', '')}）`,
      sub: `被提到 ${t.episode_count} 集 · 合計 ${t.mention_total} 次 · 最近 ${t.last_seen}`,
      keywords: `${t.ticker} ${t.display_name}`,
    })),
  ];

  return (
    <>
      <h1>搜尋</h1>
      <p className="mt-2 text-[15px] text-slate-600">
        目前可以搜集號、日期、個股名與代號。逐字稿不在本站，因此搜不到節目內文。
      </p>
      <div className="mt-4">
        <SearchClient docs={docs} />
      </div>
      <Disclaimer />
    </>
  );
}
