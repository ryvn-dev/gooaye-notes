// 閘門：每一個螢光句都必須真的講到它 tooltip 上那一檔。
// 對不起來的句子讀者第一眼就會發現，所以這件事不能只靠產生器自律。
// 用法：node scripts/check-marks.mjs（沒有參數，讀 content/episodes/*.json）
import fs from 'node:fs';
import path from 'node:path';
import { mentionsTicker } from './aliases.mjs';

const DIR = path.resolve(import.meta.dirname, '..', 'content', 'episodes');
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.json')) : [];

let sentences = 0;
let marks = 0;
const bad = [];

for (const f of files.sort()) {
  const doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const known = new Set((doc.mentions ?? []).filter((m) => m.publish !== false).map((m) => m.ticker));
  (doc.blocks ?? []).forEach((b, bi) => {
    (b.sentences ?? []).forEach((s, si) => {
      if (!s.marks?.length) return;
      sentences++;
      for (const m of s.marks) {
        marks++;
        const where = `EP${doc.ep_number} b${bi}:${si} [${m.ticker}]`;
        if (!known.has(m.ticker)) bad.push(`${where} 不在相關個股列裡 ${s.text.slice(0, 24)}`);
        else if (!mentionsTicker(s.text, m.ticker)) bad.push(`${where} 句子沒提到這一檔：${s.text.slice(0, 24)}`);
      }
      if (b.kind === 'quote') bad.push(`EP${doc.ep_number} b${bi}:${si} 引用段不該有螢光`);
    });
  });
}

if (bad.length) {
  console.error(`check:marks 紅 —— ${bad.length} 句對不上：`);
  for (const line of bad) console.error(`  ${line}`);
  process.exit(1);
}
console.log(`check:marks 綠 —— ${files.length} 集、${sentences} 個螢光句、${marks} 個標記，全部對得上。`);
