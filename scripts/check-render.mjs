// 閘門：內容 JSON 裡的每一段（含代言段與來信引用）都要真的出現在輸出的 HTML 裡。
// 代言段曾經整段從頁面消失（元件只畫句子陣列，而代言段沒有切句），資料是對的、畫面是空的，
// 只看資料的閘門抓不到這種。用法：node scripts/check-render.mjs（build 之後自動跑）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'content', 'episodes');
const OUT = path.join(ROOT, 'out');

if (!fs.existsSync(OUT)) {
  console.error('check:render 紅 —— 沒有 out/，先跑 next build');
  process.exit(1);
}

// 取一段裡最長的一串中文，避開 HTML 實體跳脫與元件切出來的 span 邊界。
const cjkRun = (s) =>
  (String(s).match(/[一-鿿]+/g) ?? []).sort((a, b) => b.length - a.length)[0] ?? null;

const bad = [];
let checked = 0;

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json')).sort()) {
  const doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const page = path.join(OUT, 'p', doc.show, doc.slug, 'index.html');
  if (!fs.existsSync(page)) { bad.push(`EP${doc.ep_number} 沒有產出頁面 ${page}`); continue; }
  const html = fs.readFileSync(page, 'utf8');
  (doc.blocks ?? []).forEach((b, bi) => {
    const parts = b.sentences?.length ? b.sentences.map((s) => s.text) : [b.text];
    for (const part of parts) {
      const run = cjkRun(part);
      if (!run || run.length < 4) continue;
      checked++;
      if (!html.includes(run)) {
        bad.push(`EP${doc.ep_number} b${bi}${b.ad ? '（代言段）' : ''} 沒有出現在頁面：${part.slice(0, 24)}`);
      }
    }
  });
}

if (bad.length) {
  console.error(`check:render 紅 —— ${bad.length} 段沒上頁面：`);
  for (const line of bad.slice(0, 40)) console.error(`  ${line}`);
  process.exit(1);
}
console.log(`check:render 綠 —— ${checked} 段／句全部出現在輸出的 HTML 裡。`);
