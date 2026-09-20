import StanceIcon from '@/components/StanceIcon';
import type { Perf, Stance } from '@/lib/content';

const pctText = (v: number | null) => (v === null ? null : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
const tone = (v: number | null) => (v === null ? '#6b6b6b' : v > 0 ? '#C0392B' : v < 0 ? '#2E7D5B' : '#6b6b6b');

/**
 * 代碼 chip：代碼 + 立場 icon，hover／長按顯示那次提及之後的漲跌。
 * 數字是 build 時用日線快取算好的，前端不打 API。
 */
export default function PerfChip({
  ticker,
  stance,
  p,
  perf,
  href,
}: {
  ticker: string;
  stance: Stance;
  p?: number | null;
  perf?: Perf | null;
  href?: string;
}) {
  const code = ticker.replace('TW:', '');
  const body = (
    <>
      <span className="font-mono">{code}</span>
      <StanceIcon stance={stance} p={p ?? null} />
    </>
  );
  return (
    <span className="group relative inline-flex items-center gap-1 text-[14px] text-[#6b6b6b]">
      {href ? (
        <a href={href} className="inline-flex items-center gap-1 no-underline">
          {body}
        </a>
      ) : (
        body
      )}
      <span className="pointer-events-none absolute left-0 top-full z-30 hidden w-max max-w-[260px] whitespace-nowrap border border-[#e5e5e5] bg-white px-2 py-1 text-[12px] leading-5 text-[#242424] group-hover:block group-focus-within:block">
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
