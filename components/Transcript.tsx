import MarkedSentence, { type Tip } from '@/components/MarkedSentence';
import TimecodeButton from '@/components/TimecodeButton';
import type { Block, Mention } from '@/lib/content';

/**
 * 結構化逐字稿：小標、主文段、來信引用、代言段。層級只靠排版，不貼任何說明文字。
 * 提到個股與對到重點的句子都是同一種淡黃螢光筆，點了才出現「代碼 + 立場」的小 tooltip。
 */
function Body({ block, bi }: { block: Block; bi: number }) {
  return (
    <>
      {block.t !== null && block.t !== undefined && (
        <>
          <TimecodeButton seconds={block.t} big />{' '}
        </>
      )}
      {block.sentences.map((s, si) => {
        if (s.key_point === null && s.marks.length === 0) return <span key={si}>{s.text}</span>;
        const tips: Tip[] = s.marks.map((m) => ({
          code: m.ticker.replace('TW:', ''),
          stance: m.stance,
          p: null,
        }));
        return <MarkedSentence key={si} id={`s-${bi}-${si}`} text={s.text} tips={tips} />;
      })}
    </>
  );
}

export default function Transcript({ blocks }: { blocks: Block[] }) {
  const sections: React.ReactNode[][] = [[]];
  const titles: (string | null)[] = [null];
  let ads: React.ReactNode[] = [];

  const cur = () => sections[sections.length - 1];
  const flushAds = () => {
    if (!ads.length) return;
    cur().push(
      <div
        key={`ad-${cur().length}`}
        className="my-7 bg-[#f7f7f7] px-3 py-2 text-[14px] leading-[1.7] text-[#6b6b6b]"
      >
        {ads}
      </div>,
    );
    ads = [];
  };

  blocks.forEach((b, bi) => {
    if (b.kind === 'h2') {
      flushAds();
      sections.push([]);
      titles.push(b.text);
      return;
    }
    const inner = <Body block={b} bi={bi} />;
    if (b.ad) {
      ads.push(
        <p key={bi} className="m-0 mt-3 first:mt-0">
          {inner}
        </p>,
      );
      return;
    }
    flushAds();
    const prev = blocks[bi - 1];
    const next = blocks[bi + 1];
    // 口誤自糾：來信 → 主持人一句短插話 → 同一封信的更正，三塊是同一封信，包成一個引用塊。
    const interjection = b.kind === 'p' && b.text.length <= 40 && prev?.kind === 'quote' && next?.kind === 'quote';
    const continues = b.kind === 'quote' && prev?.kind === 'p' && prev.text.length <= 40 && blocks[bi - 2]?.kind === 'quote';
    if (interjection || continues) {
      const box = cur()[cur().length - 1] as React.ReactElement<{ children?: React.ReactNode }>;
      const kids = Array.isArray(box.props.children) ? box.props.children : [box.props.children];
      cur()[cur().length - 1] = (
        <blockquote key={`q-${bi}`} className="my-[1.6em] border-l-2 border-[#e0e0e0] pl-4 text-[#6b6b6b]">
          {kids}
          <span key={bi} className={interjection ? 'mt-2 block text-[#242424]' : 'mt-2 block'}>
            {inner}
          </span>
        </blockquote>
      );
      return;
    }
    // 來信之後的回答貼著來信（稽核 F §2-2：回答與下一封信等距時看不出在回誰）。
    const tight = prev?.kind === 'quote' && b.kind === 'p';
    cur().push(
      b.kind === 'quote' ? (
        <blockquote key={bi} className="my-[1.6em] border-l-2 border-[#e0e0e0] pl-4 text-[#6b6b6b]">
          <span className="block">{inner}</span>
        </blockquote>
      ) : (
        <p key={bi} className={tight ? 'mt-[0.6em] mb-0' : 'mt-[1.2em] mb-0'}>
          {inner}
        </p>
      ),
    );
  });
  flushAds();

  return (
    <div className="mt-3">
      {sections.map((nodes, i) =>
        nodes.length === 0 && titles[i] === null ? null : (
          <section key={i} className="tx-section">
            {titles[i] && (
              <h3 className="mt-[2.2em] mb-2 scroll-mt-20 text-[20px] leading-[1.5] font-bold">{titles[i]}</h3>
            )}
            {nodes}
          </section>
        ),
      )}
    </div>
  );
}
