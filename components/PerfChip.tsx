import StanceIcon from '@/components/StanceIcon';
import type { Perf, Stance } from '@/lib/content';

const pctText = (v: number | null) => (v === null ? null : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
const tone = (v: number | null) => (v === null ? '#6b6b6b' : v > 0 ? '#C0392B' : v < 0 ? '#2E7D5B' : '#6b6b6b');

/**
 * 代碼 chip：代碼 + 簡稱 + 立場 icon，hover／長按顯示那次提及之後的漲跌。
 * 代碼一定要配名字：台股四碼（3661）單獨出現沒有人認得出是哪一家。
 * 數字是 build 時用日線快取算好的，前端不打 API。
 *
 * `head="perf"`：個股頁已經整頁都是同一檔，代碼再印一次是雜訊 ——
 * 露在外面的改成漲跌百分比，起算日與 5／21 日照樣在同一個 tooltip 裡（不另外做一套）。
 */
export default function PerfChip({
  ticker,
  name,
  stance,
  stances,
  p,
  perf,
  href,
  head = 'chip',
}: {
  ticker: string;
  name?: string | null;
  stance: Stance;
  stances?: Stance[];
  p?: number | null;
  perf?: Perf | null;
  href?: string;
  head?: 'chip' | 'perf';
}) {
  const code = ticker.replace('TW:', '');
  const body =
    head === 'perf' ? (
      <span className="tabular-nums" style={{ color: tone(perf?.pct ?? null) }}>
        {pctText(perf?.pct ?? null) ?? '—'}
      </span>
    ) : (
      <>
        <span className="font-mono">{code}</span>
        {name && name !== code && <span>{name}</span>}
        <StanceIcon stance={stance} p={p ?? null} />
      </>
    );
  return (
    <span
      data-chip={head === 'chip' ? code : undefined}
      className="group relative inline-flex items-center gap-1 text-[14px] text-[#6b6b6b]"
    >
      {href ? (
        <a href={href} className="inline-flex items-center gap-1 no-underline">
          {body}
        </a>
      ) : (
        body
      )}
      <span className="pointer-events-none absolute left-0 top-full z-30 hidden w-max max-w-[260px] flex-col whitespace-nowrap border border-[#e5e5e5] bg-white px-2 py-1 text-[12px] leading-5 text-[#242424] group-hover:flex group-focus-within:flex">
        {stance === 'mixed' && stances && stances.length > 1 && (
          <span className="mb-0.5 flex items-center gap-2">
            {stances.map((st) => (
              <span key={st} className="inline-flex items-center gap-1">
                <StanceIcon stance={st} />
                <span>{st === 'bullish' ? '看多' : st === 'bearish' ? '看空' : '沒有方向'}</span>
              </span>
            ))}
          </span>
        )}
        {perf ? (
          <>
            <span>
              {perf.base_date} 收盤 {perf.base} → {perf.last_date} {perf.last}{' '}
            </span>
            <span style={{ color: tone(perf.pct) }}>{pctText(perf.pct)}</span>
            {(perf.d5 !== null || perf.d21 !== null) && (
              <span className="text-[#6b6b6b]">
                {perf.d5 !== null && (
                  <>
                    {' · 5 日 '}
                    <span style={{ color: tone(perf.d5) }}>{pctText(perf.d5)}</span>
                  </>
                )}
                {perf.d21 !== null && (
                  <>
                    {' · 21 日 '}
                    <span style={{ color: tone(perf.d21) }}>{pctText(perf.d21)}</span>
                  </>
                )}
              </span>
            )}
          </>
        ) : (
          '報價暫時抓不到'
        )}
      </span>
    </span>
  );
}
