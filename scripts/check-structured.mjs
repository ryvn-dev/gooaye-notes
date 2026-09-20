// 閘門：結構化逐字稿去掉標記與空白後，必須逐字等於社群稿的口語內容（標題行不算口語）。
import fs from 'node:fs';
import path from 'node:path';
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
    .split('\n')
    .filter((l) => !/^\s*(#{1,6}\s|:::)/.test(l))
    .map((l) => l.replace(/^\s*>\s?/, '').replace(/\[t=\d+\]\s*/g, ''))
    .join('')
    .replace(/\s+/g, '');

export function checkEpisode(ep) {
  const segs = JSON.parse(fs.readFileSync(path.join(DIR, `EP${ep}.json`), 'utf8')).segments;
  const md = fs.readFileSync(path.join(DIR, `EP${ep}.structured.md`), 'utf8');
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
    if (r.ok) console.log(`EP${r.ep} 原文相等 ✓ ${r.chars} 字`);
    else { bad++; console.error(`EP${r.ep} 不相等，第 ${r.at} 字起\n  稿: ${r.src}\n  站: ${r.md}`); }
  }
  process.exit(bad ? 1 : 0);
}
