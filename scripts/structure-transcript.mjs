// 社群稿（已對齊、帶 markdown 結構）→ 站上用的結構化逐字稿 EP<n>.structured.md
// 只做兩件事：沿用原稿的標題／引用層級，把口語碎句合併成 150–350 字的段落。
// 一個字都不改：內文文字原封不動，段首只插入 [t=秒]。
import fs from 'node:fs';
import path from 'node:path';

const CACHE = process.env.GOOAYE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/gooaye`;
const DIR = path.join(CACHE, 'site-json', 'transcripts');
const MIN = 150;
const MAX = 350;
const TAIL = 80;
// 標籤型標題不上站（站上不出現「這段在幹嘛」的字）：贊助段落改用淡灰樣式表達，
// Q&A 與來信人名的層級交給引用樣式表達。
const LABEL_H2 = /^(贊助|廣告|Q&A|QA|問答)$/i;

export function structure(segs) {
  const out = [];        // {kind:'h2'|'p'|'quote', t, text, ad}
  let ad = false;
  let buf = [];          // 累積中的內文片段
  let bufT = null;
  let pendingT = null;   // 標題帶來的時間點

  const flush = (force = false) => {
    if (!buf.length) return;
    const text = buf.join('');
    const prev = out[out.length - 1];
    if (!force && text.length < TAIL && prev && prev.kind === 'p' && prev.ad === ad) {
      prev.text += text;
    } else {
      out.push({ kind: 'p', t: bufT, text, ad });
    }
    buf = [];
    bufT = null;
  };

  for (const s of segs) {
    const raw = String(s.text ?? '');
    const t = s.t ?? null;
    const head = raw.match(/^\s*(#{1,6})\s*(.*)$/);
    if (head) {
      flush();
      const level = head[1].length;
      const title = head[2].replace(/\*\*/g, '').trim();
      if (level === 1) { pendingT = t ?? pendingT; continue; }   // 集標題站上已有
      if (level === 2 && LABEL_H2.test(title)) {
        ad = /^(贊助|廣告)$/.test(title);
        pendingT = t ?? pendingT;
        continue;
      }
      ad = false;
      if (level === 2) out.push({ kind: 'h2', text: title });
      pendingT = t ?? pendingT;                                   // 三級（來信人名）只當段落界線
      continue;
    }
    const quote = raw.match(/^\s*>\s?(.*)$/s);
    if (quote) {
      flush();
      const text = quote[1].trim();
      if (!text) continue;
      const prev = out[out.length - 1];
      if (prev && prev.kind === 'quote') prev.text += text;
      else out.push({ kind: 'quote', t: t ?? pendingT, text, ad: false });
      pendingT = null;
      continue;
    }
    const text = raw.trim();
    if (!text) continue;
    if (bufT === null) bufT = t ?? pendingT;
    pendingT = null;
    const cur = buf.join('').length;
    if (cur >= MIN && cur + text.length > MAX) flush(true);
    if (bufT === null) bufT = t;
    buf.push(text);
    if (buf.join('').length >= MIN && text.match(/[。！？」]$/)) flush(true);
  }
  flush(true);
  return out;
}

const render = (blocks) => {
  const lines = [];
  let inAd = false;
  const close = () => { if (inAd) { lines.push(':::', ''); inAd = false; } };
  for (const b of blocks) {
    if (b.kind === 'h2') { close(); lines.push(`## ${b.text}`, ''); continue; }
    if (b.ad && !inAd) { lines.push(':::ad', ''); inAd = true; }
    if (!b.ad) close();
    const stamp = b.t !== null && b.t !== undefined ? `[t=${Math.round(b.t)}] ` : '';
    lines.push(b.kind === 'quote' ? `> ${stamp}${b.text}` : `${stamp}${b.text}`, '');
  }
  close();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
};

const eps = process.argv.slice(2);
for (const ep of eps) {
  const segs = JSON.parse(fs.readFileSync(path.join(DIR, `EP${ep}.json`), 'utf8')).segments;
  const blocks = structure(segs);
  fs.writeFileSync(path.join(DIR, `EP${ep}.structured.md`), render(blocks));
  const ps = blocks.filter((b) => b.kind === 'p' && !b.ad);
  const avg = Math.round(ps.reduce((a, b) => a + b.text.length, 0) / ps.length);
  console.log(
    `EP${ep}: h2 ${blocks.filter((b) => b.kind === 'h2').length}｜段 ${ps.length}（平均 ${avg} 字）｜` +
      `引用 ${blocks.filter((b) => b.kind === 'quote').length}｜廣告段 ${blocks.filter((b) => b.ad).length}`
  );
}
