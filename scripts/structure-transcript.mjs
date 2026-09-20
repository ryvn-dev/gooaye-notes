// 社群稿（已對齊、帶 markdown 結構）→ 站上用的結構化逐字稿 EP<n>.structured.md
// 只做三件事：沿用原稿的標題與引用層級、把口語碎句合併成 150–350 字的段落、
// 補上每段的 [t=秒]。內文一個字都不改（閘門：scripts/check-structured.mjs）。
//
// 小標規矩：站上不出現「這段在幹嘛」的字。原稿的 `## 贊助`／`## Q&A` 是用途標籤，不上站
// （贊助段改用淡灰樣式表達）；來信的 `### **暱稱**：主題` 只留「主題」那一半，暱稱不上站。
// 一節太長（>2500 字）時，由 headings/EP<n>.json 補內容小標（標題 + 那一段開頭的字串）。
import fs from 'node:fs';
import path from 'node:path';

const CACHE = process.env.GOOAYE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/gooaye`;
const DIR = path.join(CACHE, 'site-json', 'transcripts');
const MIN = 150;
const MAX = 350;
const TAIL = 80;
const LABEL_H2 = /^(贊助|廣告|Q&A|QA|問答)$/i;
const SPONSOR = /(本集節目由|本集由).{0,20}(贊助|冠名)/;

export function structure(segs, extra = []) {
  const out = [];
  let ad = false;
  let buf = [];
  let bufT = null;
  let pendingT = null;

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
      if (level === 1) { pendingT = t ?? pendingT; continue; }        // 集標題站上已有
      if (level === 2 && LABEL_H2.test(title)) {
        ad = /^(贊助|廣告)$/.test(title);
        // 「本集節目由 X 贊助」是廣告的第一句，把它一起收進灰底塊。
        const prev = out[out.length - 1];
        if (ad && prev && prev.kind === 'p' && !prev.ad && SPONSOR.test(prev.text)) prev.ad = true;
        pendingT = t ?? pendingT;
        continue;
      }
      ad = false;
      // `### **暱稱**：主題` → 只留主題；沒有主題（只有暱稱）就不下標，接續上一節。
      const topic = level >= 3 ? (title.split(/[：:]/).slice(1).join('：').trim() || null) : title;
      if (topic) out.push({ kind: 'h2', text: topic });
      pendingT = t ?? pendingT;
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

  // 補小標：EP<n>.headings.json 的每一列 { after: '段落開頭的字串', title: '內容小標' }
  for (const h of extra) {
    const i = out.findIndex((b) => b.kind !== 'h2' && b.text.startsWith(h.after));
    if (i === -1) throw new Error(`補小標對不到段落開頭：${h.after}`);
    out.splice(i, 0, { kind: 'h2', text: h.title });
  }

  // 時間碼：沒有自己的 t 的段落（來信續段、被合併過的段）沿用上一段，圓點不忽有忽無。
  let last = null;
  for (const b of out) {
    if (b.kind === 'h2') continue;
    if (b.t === null || b.t === undefined) b.t = last;
    else last = b.t;
  }
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

const sections = (blocks) => {
  const out = [];
  let cur = { title: null, chars: 0 };
  for (const b of blocks) {
    if (b.kind === 'h2') { out.push(cur); cur = { title: b.text, chars: 0 }; continue; }
    cur.chars += b.text.length;
  }
  out.push(cur);
  return out.filter((s) => s.chars > 0);
};

const eps = process.argv.slice(2);
for (const ep of eps) {
  const segs = JSON.parse(fs.readFileSync(path.join(DIR, `EP${ep}.json`), 'utf8')).segments;
  const hf = path.resolve(import.meta.dirname, '..', 'headings', `EP${ep}.json`);
  const extra = fs.existsSync(hf) ? JSON.parse(fs.readFileSync(hf, 'utf8')) : [];
  const blocks = structure(segs, extra);
  fs.writeFileSync(path.join(DIR, `EP${ep}.structured.md`), render(blocks));
  const ps = blocks.filter((b) => b.kind === 'p' && !b.ad);
  const secs = sections(blocks);
  const longest = secs.reduce((a, s) => (s.chars > a.chars ? s : a), { chars: 0, title: '' });
  const untitled = secs.filter((s) => s.title === null).reduce((a, s) => a + s.chars, 0);
  const total = secs.reduce((a, s) => a + s.chars, 0);
  console.log(
    `EP${ep}: 小標 ${blocks.filter((b) => b.kind === 'h2').length}｜段 ${ps.length}（平均 ${Math.round(
      ps.reduce((a, b) => a + b.text.length, 0) / ps.length,
    )} 字）｜引用 ${blocks.filter((b) => b.kind === 'quote').length}｜廣告段 ${blocks.filter((b) => b.ad).length}｜` +
      `最長一節 ${longest.chars} 字（${longest.title ?? '無標題'}）｜無標題區 ${Math.round((untitled / total) * 100)}%`,
  );
}
