import Link from 'next/link';
import type { Metadata } from 'next';
import { getIndex, getTickers, getTranscriptFacts, stancesOf, tickerSlug, type TickerRow } from '@/lib/content';
import StanceIcon from '@/components/StanceIcon';
import { abs } from '@/lib/site';

export const metadata: Metadata = {
  title: '股癌提到過哪些個股｜個股索引',
  description: '股癌 podcast 被提到過的個股索引：每一檔一頁，看得到歷次被提到的集數、句數與時間碼。非官方整理，非投資建議。',
  alternates: { canonical: abs('/ticker/') },
};

export default function TickerIndex() {
  const { tickers, ticker_count } = getTickers();
  const idx = getIndex();
  const facts = getTranscriptFacts();

  // 「次」曾經是 mentions.csv 的 mention_count 加總，別名掃描進來的檔一律 0，
  // 於是列表上出現「1 集 · 0 次」。改成逐字稿裡真的被標到的句子數，與螢光筆同一個口徑。
  const said = (t: TickerRow) => facts.sentences[t.ticker] ?? 0;

  // 預設排序＝最近被講到的在上面，同一天再比句數。
  // 舊的排序是集數遞減、同分用代號字母，六集的資料裡 14 檔並列 1 集，版面就是一張字母表。
  const rows = [...tickers]
    .filter((t) => t.timeline.length > 0 && t.display_name.trim() !== '')
    .sort(
      (a, b) =>
        b.last_seen.localeCompare(a.last_seen) ||
        said(b) - said(a) ||
        b.episode_count - a.episode_count ||
        a.ticker.localeCompare(b.ticker),
    );

  const group = (title: string, list: TickerRow[]) =>
    list.length === 0 ? null : (
      <section className="mt-8">
        <h2>{title}（{list.length} 檔）</h2>
        <ul className="mt-2 divide-y divide-[#eee]">
          {list.map((t) => {
            const n = said(t);
            // 立場一集一個 icon，由舊到新排；紅上箭＝看多、綠下箭＝看空、灰點＝沒有方向。
            const marks = [...t.timeline].sort((a, b) => a.published_at.localeCompare(b.published_at));
            return (
              <li key={t.ticker} className="py-3">
                <div className="flex items-baseline gap-2">
                  <Link
                    href={`/ticker/${tickerSlug(t.ticker)}/`}
                    className="font-bold text-[#242424] no-underline"
                  >
                    {t.display_name}
                  </Link>
                  <span className="font-mono text-[13px] text-[#6b6b6b]">{t.ticker.replace('TW:', '')}</span>
                  <span className="ml-auto flex shrink-0 flex-wrap items-center gap-1">
                    {marks.map((r) => (
                      <span key={r.slug} className="inline-flex items-center gap-0.5">
                        {stancesOf(r).map((st) => (
                          <StanceIcon key={st} stance={st} p={r.jev_prob} />
                        ))}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-2 text-[13px] text-[#6b6b6b]">
                  <time dateTime={t.last_seen}>{t.last_seen}</time>
                  <span>·</span>
                  <span className="tabular-nums">
                    {t.episode_count} 集{n > 0 ? ` · ${n} 句` : ''}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <>
      <h1>股癌提到過的個股</h1>
      <p className="mt-2">
        共 {ticker_count} 檔，來自 {idx.episode_count} 集節目（{idx.coverage.from} 至 {idx.coverage.to}）。
        最近被講到的排在上面：日期是最後一次講到的那一集，「集」是講到它的集數，「句」是逐字稿裡講到它的句子數。
        右邊一集一個記號，紅上箭是看多、綠下箭是看空、灰點是沒有講方向。
      </p>
      {group('美股', rows.filter((t) => t.market === 'US'))}
      {group('台股', rows.filter((t) => t.market === 'TW'))}
    </>
  );
}
