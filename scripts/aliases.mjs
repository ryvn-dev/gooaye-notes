// 代號 → 節目裡會出現的講法。只讀進版控的那一份 aliases/merged.json ——
// 上游（ryvn-finance 的 aliases.csv）只有這台機器讀得到，CI 讀不到就會本機綠、CI 紅。
// 要更新別名表跑 `npm run aliases:sync`。
// 比對規則：臺/台 視為同一個字；拉丁字母的別名要前後有邊界才算（避免 MU 命中 MULTI）。
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const NAMES = JSON.parse(fs.readFileSync(path.join(HERE, 'ticker-names.json'), 'utf8'));
const MERGED = JSON.parse(fs.readFileSync(path.resolve(HERE, '..', 'aliases', 'merged.json'), 'utf8'));

export const norm = (s) => String(s ?? '').replace(/臺/g, '台');

/**
 * 一個代號所有可用的講法。`namesOnly` 時不含代號本身 ——
 * 「STX storage」這種產品名會命中裸代號，掃全站代號的時候要的是名字，不是代號。
 */
export const wordsOf = (ticker, { namesOnly = false } = {}) => {
  const list = [
    namesOnly ? null : ticker,
    namesOnly || !ticker.startsWith('TW:') ? null : ticker.slice(3),
    NAMES[ticker]?.name ?? null,
    ...(MERGED[ticker] ?? []),
  ];
  // 純數字（台股四碼）不單獨當別名：節目說「3661」讀者也認不出是世芯，
  // 要當螢光句的依據就得句子裡真的有名字。
  return [...new Set(
    list
      .filter((w) => w && String(w).trim().length >= 2 && !/^\d+$/.test(String(w).trim()))
      .map((w) => norm(w).trim()),
  )];
};

const isLatin = (w) => /^[A-Za-z0-9][A-Za-z0-9 .&-]*$/.test(w);

/** text 裡有沒有提到這個代號（拉丁字母要有邊界）。 */
export const mentionsTicker = (text, ticker, opts) => {
  const hay = norm(text);
  return wordsOf(ticker, opts).some((w) => {
    if (!isLatin(w)) return hay.includes(w);
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9])${esc}([^A-Za-z0-9]|$)`, 'i').test(hay);
  });
};
