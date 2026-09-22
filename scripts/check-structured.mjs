// 閘門：結構化逐字稿去掉標記與空白後，必須逐字等於社群稿的口語內容（標題行不算口語）。
//
// 例外只有一種：檔頭寫 `<!-- source: own-whisper-cleaned -->` 的那幾集 —— 底稿是我們自己的
// whisper 稿、由模型整理過錯字與標點，逐字相等不可能成立。那種改成跟**原始 whisper 稿**
// 比相似度（字元 bigram Dice），門檻 0.90：整理標點可以，整段改寫或漏段會掉下來。
import fs from 'node:fs';
import path from 'node:path';
import * as OpenCC from 'opencc-js';
const CACHE = process.env.GOOAYE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/gooaye`;
const DIR = path.join(CACHE, 'site-json', 'transcripts');

export const spokenFromSegments = (segs) =>
  segs
    .map((s) => String(s.text ?? ''))
    .filter((t) => !/^\s*#{1,6}\s/.test(t))
    .map((t) => t.replace(/^\s*>\s?/, ''))
    .join('')
    .replace(/\s+/g, '');

export const spokenFromMarkdown = (md) =>
  md
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((l) => !/^\s*(#{1,6}\s|:::)/.test(l))
    .map((l) => l.replace(/^\s*>\s?/, '').replace(/\[t=\d+\]\s*/g, ''))
    .join('')
    .replace(/\s+/g, '');

const OWN = /<!--\s*source:\s*own-whisper-cleaned/;
/** 檔頭自己寫了 `source_id: own-whisper:<檔名>` 的那幾集（`summarise.mjs` 產的）。 */
const OWN_ID = /<!--[^>]*source_id:\s*own-whisper:([A-Za-z0-9._-]+)/;
export const MIN_SIM = 0.9;

const bigrams = (t) => {
  const m = new Map();
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
};

// 我們自己的 whisper 稿出來是簡體，整理稿是繁體；比之前先轉成同一種字。
// 用庫：opencc-js（簡→繁，維護中、純 JS、只在 build 時用）。
const toTW = OpenCC.Converter({ from: 'cn', to: 'tw' });

/** 比相似度之前把標點拿掉、字形統一：整理標點與繁簡本來就是允許的，逐字內容才是要守的。 */
const spokenOnly = (t) => toTW(String(t)).replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '');

/** 字元 bigram 的 Dice 係數：0（完全不像）到 1（一模一樣）。 */
export const similarity = (rawA, rawB) => {
  const a = spokenOnly(rawA);
  const b = spokenOnly(rawB);
  if (!a.length || !b.length) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let hit = 0;
  for (const [g, n] of A) hit += Math.min(n, B.get(g) ?? 0);
  return (2 * hit) / (a.length - 1 + (b.length - 1));
};

/**
 * 自家 whisper 稿：先看 `structured.md` 檔頭自己寫的 `source_id`，
 * 沒寫才回頭找 site-json/EP<n>.json 的那一欄 —— 抽取層還沒跑過的集（EP694／EP695）
 * 沒有那個檔，而閘門不該因為「另一條 lane 還沒跑」就紅。
 */
const whisperText = (ep, raw = '') => {
  const inline = raw.match(OWN_ID)?.[1] ?? null;
  const meta = path.join(CACHE, 'site-json', `EP${ep}.json`);
  const sid = inline
    ? `own-whisper:${inline}`
    : fs.existsSync(meta)
      ? (JSON.parse(fs.readFileSync(meta, 'utf8')).source_id ?? '')
      : '';
  const name = sid.startsWith('own-whisper:') ? sid.slice('own-whisper:'.length) : null;
  if (!name) return null;
  const f = path.join(CACHE, 'transcripts', `${name}.json`);
  if (!fs.existsSync(f)) return null;
  const segs = JSON.parse(fs.readFileSync(f, 'utf8')).segments ?? [];
  return segs.map((x) => String(x.text ?? '')).join('').replace(/\s+/g, '');
};

export function checkEpisode(ep) {
  const mdPath = path.join(DIR, `EP${ep}.structured.md`);
  const raw = fs.readFileSync(mdPath, 'utf8');
  if (OWN.test(raw)) {
    const src = whisperText(ep, raw);
    const site = spokenFromMarkdown(raw);
    if (src === null) return { ep, ok: false, at: 0, src: '找不到原始 whisper 稿（source_id 對不到檔）', md: '' };
    const sim = similarity(src, site);
    if (sim >= MIN_SIM) return { ep, ok: true, chars: site.length, sim, source: 'own-whisper-cleaned' };
    return {
      ep,
      ok: false,
      at: 0,
      sim,
      src: `與原 whisper 稿相似度 ${sim.toFixed(3)}（要 ≥ ${MIN_SIM}）`,
      md: `原稿 ${src.length} 字、站上 ${site.length} 字`,
    };
  }
  const segs = JSON.parse(fs.readFileSync(path.join(DIR, `EP${ep}.json`), 'utf8')).segments;
  const md = raw;
  const a = spokenFromSegments(segs);
  const b = spokenFromMarkdown(md);
  if (a === b) return { ep, ok: true, chars: a.length };
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return { ep, ok: false, at: i, src: a.slice(Math.max(0, i - 40), i + 40), md: b.slice(Math.max(0, i - 40), i + 40) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const eps = process.argv.slice(2);
  let bad = 0;
  for (const ep of eps) {
    const r = checkEpisode(ep);
    if (r.ok && r.sim !== undefined) console.log(`EP${r.ep} 與原 whisper 稿相似度 ${r.sim.toFixed(3)} ✓ ${r.chars} 字`);
    else if (r.ok) console.log(`EP${r.ep} 原文相等 ✓ ${r.chars} 字`);
    else { bad++; console.error(`EP${r.ep} 不相等，第 ${r.at} 字起\n  稿: ${r.src}\n  站: ${r.md}`); }
  }
  process.exit(bad ? 1 : 0);
}
