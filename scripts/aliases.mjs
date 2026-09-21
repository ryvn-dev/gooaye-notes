// 代號 → 節目裡會出現的講法。三個來源合起來：
// ryvn-finance 的 aliases.csv（中文別名，唯讀）、站上的中文名、aliases/extra.json（英文與口語講法）。
// 比對規則：臺/台 視為同一個字；拉丁字母的別名要前後有邊界才算（避免 MU 命中 MULTI）。
import fs from 'node:fs';
import path from 'node:path';

const FIN = process.env.FIN_REPO || `${process.env.HOME}/code/gh-ryvn-dev/ryvn-finance`;
const HERE = import.meta.dirname;

const csvRows = (file) => {
  if (!fs.existsSync(file)) return [];
  const [head, ...rest] = fs.readFileSync(file, 'utf8').trim().split('\n');
  const cols = head.split(',');
  return rest.map((line) => Object.fromEntries(line.split(',').map((v, i) => [cols[i], v])));
};

const NAMES = JSON.parse(fs.readFileSync(path.join(HERE, 'ticker-names.json'), 'utf8'));
const EXTRA = JSON.parse(fs.readFileSync(path.resolve(HERE, '..', 'aliases', 'extra.json'), 'utf8'));

const fromCsv = {};
for (const r of csvRows(path.join(FIN, 'data', 'podcasts', 'aliases.csv'))) {
  if (!r.ticker || !r.alias) continue;
  (fromCsv[r.ticker] ||= []).push(r.alias);
}

export const norm = (s) => String(s ?? '').replace(/臺/g, '台');

/** 一個代號所有可用的講法（含代號本身與台股四碼）。 */
export const wordsOf = (ticker) => {
  const list = [
    ticker,
    ticker.startsWith('TW:') ? ticker.slice(3) : null,
    NAMES[ticker]?.name ?? null,
    ...(fromCsv[ticker] ?? []),
    ...(Array.isArray(EXTRA[ticker]) ? EXTRA[ticker] : []),
  ];
  return [...new Set(list.filter((w) => w && String(w).trim().length >= 2).map((w) => norm(w).trim()))];
};

const isLatin = (w) => /^[A-Za-z0-9][A-Za-z0-9 .&-]*$/.test(w);

/** text 裡有沒有提到這個代號（拉丁字母要有邊界）。 */
export const mentionsTicker = (text, ticker) => {
  const hay = norm(text);
  return wordsOf(ticker).some((w) => {
    if (!isLatin(w)) return hay.includes(w);
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9])${esc}([^A-Za-z0-9]|$)`, 'i').test(hay);
  });
};
