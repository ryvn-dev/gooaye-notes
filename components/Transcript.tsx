import PerfLine from '@/components/PerfLine';
import StanceIcon from '@/components/StanceIcon';
import SeekDot from '@/components/SeekDot';
import { stancesOf, type Block, type Mention, type Sentence } from '@/lib/content';

/**
 * 結構化逐字稿：小標、主文段、引用段、代言段，層級只靠排版，不貼任何說明文字。
 * 提到個股的句子是細虛線底線、重點句是黃底，兩種都只在 hover／聚焦時才跳出 tooltip。
 */
function Tip({
  s,
  keyPoints,
  byTicker,
}: {
  s: Sentence;
  keyPoints: { text: string }[];
  byTicker: Record<string, Mention>;
}) {
  const ms = s.tickers.map((t) => byTicker[t]).filter(Boolean);
  return (
    <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-full border border-[#e5e5e5] bg-white px-2 py-1 text-[13px] leading-6 font-normal whitespace-normal text-[#242424] no-underline group-hover:block group-focus-within:block">
      {s.key_point !== null && keyPoints[s.key_point] && (
        <span className="block font-medium">{keyPoints[s.key_point].text}</span>
      )}
      {ms.map((m) => (
        <span key={m.ticker} className="mt-1 block first:mt-0">
          <span className="block">
            <span className="font-mono">{m.ticker.replace('TW:', '')}</span> {m.display_name}{' '}
            <StanceIcon stance={stancesOf(m)[0] ?? 'mentioned'} p={m.jev_prob} />
          </span>
          <span className="block text-[12px] text-[#6b6b6b]">
            <PerfLine perf={m.perf} />
          </span>
        </span>
      ))}
    </span>
  );
}

function Body({
  block,
  bi,
  keyPoints,
  byTicker,
}: {
  block: Block;
  bi: number;
  keyPoints: { text: string }[];
  byTicker: Record<string, Mention>;
}) {
  return (
    <>
      {block.t !== null && block.t !== undefined && <SeekDot seconds={block.t} />}
      {block.sentences.map((s, si) => {
        const marked = s.key_point !== null || s.tickers.length > 0;
        if (!marked) return <span key={si}>{s.text}</span>;
        const cls = [
          'group',
          s.key_point !== null ? 'bg-[#fff3b0]' : '',
          s.tickers.length ? 'underline decoration-dotted decoration-[#b3b3b3] underline-offset-4' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <span key={si} id={`s-${bi}-${si}`} tabIndex={0} className={`scroll-mt-16 ${cls}`}>
            {s.text}
            <Tip s={s} keyPoints={keyPoints} byTicker={byTicker} />
          </span>
        );
      })}
    </>
  );
}

export default function Transcript({
  blocks,
  mentions,
  keyPoints,
}: {
  blocks: Block[];
  mentions: Mention[];
  keyPoints: { text: string }[];
}) {
  const byTicker = Object.fromEntries(mentions.map((m) => [m.ticker, m]));
  const out: React.ReactNode[] = [];
  let ads: React.ReactNode[] = [];
  const flushAds = () => {
    if (!ads.length) return;
    out.push(
      <div key={`ad-${out.length}`} className="my-7 bg-[#f7f7f7] px-3 py-2 text-[13px] leading-7 text-[#6b6b6b]">
        {ads}
      </div>,
    );
    ads = [];
  };

  blocks.forEach((b, bi) => {
    if (b.kind === 'h2') {
      flushAds();
      out.push(
        <h2 key={bi} className="mt-10 mb-0 text-[17px] leading-[1.9] font-semibold">
          {b.text}
        </h2>,
      );
      return;
    }
    const inner = <Body block={b} bi={bi} keyPoints={keyPoints} byTicker={byTicker} />;
    if (b.ad) {
      ads.push(
        <p key={bi} className="relative m-0 mt-3 first:mt-0">
          {inner}
        </p>,
      );
      return;
    }
    flushAds();
    out.push(
      b.kind === 'quote' ? (
        <blockquote key={bi} className="relative my-[1.2em] border-l-2 border-[#e0e0e0] pl-4 text-[#6b6b6b]">
          {inner}
        </blockquote>
      ) : (
        <p key={bi} className="relative mt-[1.2em] mb-0">
          {inner}
        </p>
      ),
    );
  });
  flushAds();

  return <div className="mt-3">{out}</div>;
}
