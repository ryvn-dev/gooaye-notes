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

// 立場列（chip 列）實際畫出來幾個 chip，必須等於「提及 N 檔」那個數字。
// 之前首頁截前三檔、index 又只放前八檔，於是數字跟眼睛看到的對不上。
const chipRows = (html) => [...html.matchAll(/data-chiprow="(\d+)"([\s\S]*?)<\/ul>/g)]
  .map((m) => ({ said: Number(m[1]), drawn: (m[2].match(/data-chip="/g) ?? []).length }));

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

// 集頁：立場列的 chip 數 === 上站的個股數
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.json')).sort()) {
  const doc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const page = path.join(OUT, 'p', doc.show, doc.slug, 'index.html');
  if (!fs.existsSync(page)) continue;
  const listed = (doc.mentions ?? []).filter((m) => m.publish !== false);
  const shown = listed.length;
  // 第三個數字：逐字稿裡真的被標到的檔（立場句 ∪ 提到句）。三個要互等。
  const marked = new Set();
  (doc.blocks ?? []).forEach((b) => (b.sentences ?? []).forEach((sn) => sn.marks.forEach((mk) => marked.add(mk.ticker))));
  const union = new Set([...listed.map((m) => m.ticker), ...marked]);
  const row = chipRows(fs.readFileSync(page, 'utf8'))[0];
  if (!row && shown > 0) bad.push(`EP${doc.ep_number} 集頁沒有立場列，但上站 ${shown} 檔`);
  else if (row && (row.said !== shown || row.drawn !== shown)) {
    bad.push(`EP${doc.ep_number} 立場列 ${row.drawn} 檔 / 標示 ${row.said}，上站是 ${shown} 檔`);
  }
  if (union.size !== shown) {
    bad.push(`EP${doc.ep_number} 立場列 ∪ 提到句 ${union.size} 檔，但相關個股只有 ${shown} 檔`);
  }
}

// 首頁：每一張卡的 chip 數 === 那一集的「提及 N 檔」
{
  const home = path.join(OUT, 'index.html');
  const idx = path.join(ROOT, 'content', 'index.json');
  if (fs.existsSync(home) && fs.existsSync(idx)) {
    const eps = JSON.parse(fs.readFileSync(idx, 'utf8')).episodes ?? [];
    const rows = chipRows(fs.readFileSync(home, 'utf8'));
    eps.forEach((e, i) => {
      const r = rows[i];
      if (!r) return;
      if (r.drawn !== e.mention_total || r.said !== e.mention_total) {
        bad.push(`首頁 EP${e.ep_number} 立場列 ${r.drawn} 檔，但寫「提及 ${e.mention_total} 檔」`);
      }
    });
  }
}

if (bad.length) {
  console.error(`check:render 紅 —— ${bad.length} 段沒上頁面：`);
  for (const line of bad.slice(0, 40)) console.error(`  ${line}`);
  process.exit(1);
}
console.log(`check:render 綠 —— ${checked} 段／句全部出現在輸出的 HTML 裡，立場列的 chip 數也對得上。`);
