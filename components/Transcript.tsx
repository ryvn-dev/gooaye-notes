import MarkedSentence, { type Tip } from '@/components/MarkedSentence';
import TimecodeButton from '@/components/TimecodeButton';
import type { Block, Mention } from '@/lib/content';

/**
 * 結構化逐字稿：小標、主文段、來信引用、代言段。層級只靠排版，不貼任何說明文字。
 * 提到個股的句子是淡黃螢光筆、對到重點的句子是淡藍；兩者都是的那一句黃底加藍色下緣線。
 */
function Body({ block, bi, names }: { block: Block; bi: number; names: Record<string, string> }) {
  return (
    <>
      {block.t !== null && block.t !== undefined && (
        <>
          <TimecodeButton seconds={block.t} big />{' '}
        </>
      )}
      {/* 代言段不切句（不標螢光、不對重點），但字要照樣出來。 */}
      {block.sentences.length === 0 && block.text}
      {block.sentences.map((s, si) => {
        if (s.key_point === null && s.marks.length === 0) return <span key={si}>{s.text}</span>;
        const tips: Tip[] = s.marks.map((m) => ({
          code: m.ticker.replace('TW:', ''),
          name: names[m.ticker] ?? null,
          stance: m.stance,
          p: null,
        }));
        return <MarkedSentence key={si} id={`s-${bi}-${si}`} text={s.text} tips={tips} kp={s.key_point} />;
      })}
    </>
  );
}

export default function Transcript({ blocks, names = {} }: { blocks: Block[]; names?: Record<string, string> }) {
  const sections: React.ReactNode[][] = [[]];
  // 每一段都掛一個 b-<段序> 的錨點：搜尋結果命中哪一段，就跳到哪一段（沒有 id 就跳不進去）。
  const titles: { text: string; bi: number }[] = [{ text: '', bi: -1 }];
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
      titles.push({ text: b.text, bi });
      return;
    }
    const inner = <Body block={b} bi={bi} names={names} />;
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
          <span key={bi} id={`b-${bi}`} className={`scroll-mt-20 ${interjection ? 'mt-2 block text-[#242424]' : 'mt-2 block'}`}>
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
        <blockquote key={bi} id={`b-${bi}`} className="my-[1.6em] scroll-mt-20 border-l-2 border-[#e0e0e0] pl-4 text-[#6b6b6b]">
          <span className="block">{inner}</span>
        </blockquote>
      ) : (
        <p key={bi} id={`b-${bi}`} className={`scroll-mt-20 ${tight ? 'mt-[0.6em] mb-0' : 'mt-[1.2em] mb-0'}`}>
          {inner}
        </p>
      ),
    );
  });
  flushAds();

  return (
    <div className="mt-3">
      {sections.map((nodes, i) =>
        nodes.length === 0 && titles[i].bi < 0 ? null : (
          <section key={i} className="tx-section">
            {titles[i].text && (
              <h3
                id={`b-${titles[i].bi}`}
                className="mt-[2.2em] mb-2 scroll-mt-20 text-[20px] leading-[1.5] font-bold"
              >
                {titles[i].text}
              </h3>
            )}
            {nodes}
          </section>
        ),
      )}
    </div>
  );
}
