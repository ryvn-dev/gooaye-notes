// 把三處講法合併成 aliases/merged.json（站上唯一的別名來源）。
// 為什麼要落檔：ryvn-finance 的 aliases.csv 只在這台機器上，CI 讀不到 ——
// 之前本機閘門綠、CI 紅就是這個原因。合併檔進版控，本機與 CI 才算同一件事。
// 用法：node scripts/sync-aliases.mjs（改了上游別名表才要跑）
import fs from 'node:fs';
import path from 'node:path';

const FIN = process.env.FIN_REPO || `${process.env.HOME}/code/gh-ryvn-dev/ryvn-finance`;
const HERE = import.meta.dirname;
const OUT = path.resolve(HERE, '..', 'aliases', 'merged.json');

const NAMES = JSON.parse(fs.readFileSync(path.join(HERE, 'ticker-names.json'), 'utf8'));
const EXTRA = JSON.parse(fs.readFileSync(path.resolve(HERE, '..', 'aliases', 'extra.json'), 'utf8'));

const csv = path.join(FIN, 'data', 'podcasts', 'aliases.csv');
if (!fs.existsSync(csv)) throw new Error(`讀不到 ${csv}：這支要在有 ryvn-finance 的機器上跑`);
const [head, ...rest] = fs.readFileSync(csv, 'utf8').trim().split('\n');
const cols = head.split(',');
const fromCsv = {};
for (const line of rest) {
  const r = Object.fromEntries(line.split(',').map((v, i) => [cols[i], v]));
  if (!r.ticker || !r.alias) continue;
  (fromCsv[r.ticker] ||= []).push(r.alias);
}

const out = {};
for (const t of new Set([...Object.keys(NAMES), ...Object.keys(fromCsv), ...Object.keys(EXTRA)])) {
  if (t.startsWith('_')) continue;
  const list = [
    NAMES[t]?.name ?? null,
    NAMES[t]?.short ?? null,
    ...(fromCsv[t] ?? []),
    ...(Array.isArray(EXTRA[t]) ? EXTRA[t] : []),
  ].filter((w) => w && String(w).trim().length >= 2);
  const uniq = [...new Set(list.map((w) => String(w).trim()))];
  if (uniq.length) out[t] = uniq.sort();
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`aliases/merged.json：${Object.keys(out).length} 檔、${Object.values(out).flat().length} 個講法`);
