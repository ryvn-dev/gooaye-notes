import TimecodeButton from '@/components/TimecodeButton';
import PerfChip from '@/components/PerfChip';
import { stancesOf, type Mention, type Paragraph } from '@/lib/content';

/**
 * 結構化逐字稿：一段一個 anchor，段首一列小標籤（▶ 跳播 · 主講人 · 主題 · 個股），
 * 對得上重點的句子淡黃反白並可互相跳轉。版型來源見 docs/transcript-format-survey.md。
 */
export default function Transcript({
  paragraphs,
  mentions,
}: {
  paragraphs: Paragraph[];
  mentions: Mention[];
}) {
  const byTicker = Object.fromEntries(mentions.map((m) => [m.ticker, m]));

  return (
    <div className="mt-3">
      {paragraphs.map((p, pi) => {
        const chips = p.tickers.map((t) => byTicker[t]).filter(Boolean);
        const hasLabels = p.t !== null || p.tags.length > 0 || chips.length > 0;
        return (
          <div key={pi} id={`p-${pi}`} className="scroll-mt-16 pt-4">
            {hasLabels && (
              <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {p.t !== null && <TimecodeButton seconds={p.t} />}
                <span
                  aria-label="主持人"
                  className="grid h-4 w-4 place-items-center rounded-full bg-[#e8e8e8] text-[9px] text-[#555]"
                >
                  股
                </span>
                {p.tags.map((t) => (
                  <span key={t} className="text-[12px] text-[#767676]">
                    {t}
                  </span>
                ))}
                {chips.map((m) => (
                  <PerfChip
                    key={m.ticker}
                    ticker={m.ticker}
                    stance={stancesOf(m)[0] ?? 'mentioned'}
                    p={m.jev_prob}
                    perf={m.perf}
                  />
                ))}
              </div>
            )}
            <p className="m-0 text-[16px] leading-8">
              {p.sentences.map((s, si) =>
                s.key_point !== null ? (
                  <a
                    key={si}
                    id={`s-${pi}-${si}`}
                    href={`#kp-${s.key_point}`}
                    className="bg-[#fff3b0] underline decoration-[#d9b43c] underline-offset-4"
                  >
                    {s.text}
                  </a>
                ) : s.quote_of ? (
                  <mark key={si} id={`s-${pi}-${si}`} className="bg-[#fff3b0] text-inherit">
                    {s.text}
                  </mark>
                ) : (
                  <span key={si}>{s.text}</span>
                ),
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
