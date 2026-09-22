import type { Metadata } from 'next';
import { getAllEpisodes, getTickers, getTranscriptFacts, tickerSlug } from '@/lib/content';
import SearchClient, { type SearchDoc } from '@/components/SearchClient';
import { abs } from '@/lib/site';

export const metadata: Metadata = {
  title: '搜尋集數、個股與逐字稿',
  description: '在股癌筆記裡搜尋：集號、公司名、代號，或是節目裡講過的某一句話，找到那一集與那一段。',
  alternates: { canonical: abs('/search/') },
};

export default function SearchPage() {
  const episodes = getAllEpisodes();
  const { tickers } = getTickers();
  const facts = getTranscriptFacts();

  const byDate = [...episodes].sort((a, b) => b.published_at.localeCompare(a.published_at));

  // 集：原標逐字（之前這裡自己編成「股癌 EP698 重點筆記」，同一集在首頁與搜尋頁叫不同名字）。
  // 內文：摘要、重點與逐字稿的每一段都進索引 —— 逐字稿本來就在站上，
  // 舊文案寫「逐字稿不在本站」與事實相反。
  const episodeDocs: SearchDoc[] = byDate.map((e) => ({
    kind: 'episode',
    href: `/p/${e.show}/${e.slug}/`,
    title: e.site_title,
    sub: [e.published_at, e.show_name, e.host].filter(Boolean).join(' · '),
    text: [e.summary_answer_first ?? '', e.summary ?? '', ...e.key_points.map((k) => k.text)]
      .filter(Boolean)
      .join(' '),
  }));

  const paragraphDocs: SearchDoc[] = byDate.flatMap((e) =>
    (e.blocks ?? [])
      .map((b, bi) => ({ b, bi }))
      .filter(({ b }) => !b.ad && b.text.trim().length >= 6)
      .map(({ b, bi }) => ({
        kind: 'paragraph' as const,
        href: `/p/${e.show}/${e.slug}/#b-${bi}`,
        title: e.site_title,
        sub: [e.published_at, e.show_name, e.host].filter(Boolean).join(' · '),
        text: b.text,
      })),
  );

  const tickerDocs: SearchDoc[] = tickers.map((t) => {
    const n = facts.sentences[t.ticker] ?? 0;
    return {
      kind: 'ticker',
      href: `/ticker/${tickerSlug(t.ticker)}/`,
      title: `${t.display_name}（${t.ticker.replace('TW:', '')}）`,
      sub: `${t.episode_count} 集${n > 0 ? ` · ${n} 句` : ''} · 最近 ${t.last_seen}`,
      text: [t.ticker.replace('TW:', ''), t.display_name, t.short_name ?? ''].join(' '),
    };
  });

  return (
    <>
      <h1>搜尋</h1>
      <p className="mt-2 text-[15px] text-[#6b6b6b]">
        集號、日期、公司名、代號，或是節目裡講過的某一句話都可以搜。
        搜到逐字稿裡的句子時，點進去會直接停在那一段。
      </p>
      <div className="mt-4">
        <SearchClient docs={[...episodeDocs, ...tickerDocs, ...paragraphDocs]} browse={episodeDocs.length + tickerDocs.length} />
      </div>
    </>
  );
}
