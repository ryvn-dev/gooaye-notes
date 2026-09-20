// 個股頁價量圖的日線來源：Yahoo Finance 的公開 chart endpoint（免費、免 key、美股與台股同一支）。
// stooq 2026-09 起整站掛了 JavaScript proof-of-work challenge，`curl` 拿到的是驗證頁不是 CSV，所以改用 Yahoo。
// 快取在 ~/.ryvn-finance/podcasts/prices/<ticker>.json（不進 repo 的那一份是全歷史），
// 站上只放最近 13 個月。抓不到的代號留在 _missing.json，頁面顯示「報價暫時抓不到」，不補 0。
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'content', 'prices');
const CACHE = process.env.PRICE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/prices`;
const DAYS = 400;

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

const slug = (t) => t.replace(/[.:]/g, '-');
// 台股上櫃（TPEx）在 Yahoo 是 .TWO 不是 .TW，兩個都試。
const yahooSymbols = (t) => (t.startsWith('TW:') ? [`${t.slice(3)}.TW`, `${t.slice(3)}.TWO`] : [t.replace(/\./g, '-')]);

const parseYahoo = (json) => {
  const r = json?.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  if (!r?.timestamp?.length || !q) return null;
  const rows = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const c = q.close?.[i];
    if (c === null || c === undefined) continue;
    rows.push({
      d: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
      o: +(q.open?.[i] ?? c).toFixed(4),
      h: +(q.high?.[i] ?? c).toFixed(4),
      l: +(q.low?.[i] ?? c).toFixed(4),
      c: +c.toFixed(4),
      v: q.volume?.[i] ?? 0,
    });
  }
  return rows.length ? rows : null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tickers = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'content', 'tickers.json'), 'utf8')).tickers;
const missing = [];
const today = new Date().toISOString().slice(0, 10);

for (const t of tickers) {
  const syms = yahooSymbols(t.ticker);
  let sym = syms[0];
  const cacheFile = path.join(CACHE, `${slug(t.ticker)}.json`);
  const cached = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : null;
  let rows = cached?.rows ?? [];
  const fresh = cached?.fetched_at === today && rows.length > 0;

  if (!fresh) {
    try {
      let got = null;
      for (const candidate of syms) {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?range=2y&interval=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } },
        );
        got = res.ok ? parseYahoo(await res.json()) : null;
        if (got) { sym = candidate; break; }
        await sleep(400);
      }
      if (got) {
        const byDate = new Map(rows.map((r) => [r.d, r]));
        for (const r of got) byDate.set(r.d, r);
        rows = [...byDate.values()].sort((a, b) => a.d.localeCompare(b.d));
        fs.writeFileSync(cacheFile, JSON.stringify({ ticker: t.ticker, symbol: sym, fetched_at: today, rows }) + '\n');
      }
    } catch {
      // 網路錯誤：沿用快取，沒有快取就進 missing
    }
    await sleep(400);
  }

  if (!rows.length) {
    missing.push({ ticker: t.ticker, symbol: sym });
    continue;
  }
  const keep = rows.slice(-DAYS);
  fs.writeFileSync(
    path.join(OUT, `${slug(t.ticker)}.json`),
    JSON.stringify({ ticker: t.ticker, source: 'yahoo', from: keep[0].d, to: keep[keep.length - 1].d, rows: keep }) + '\n',
  );
}

fs.writeFileSync(path.join(OUT, '_missing.json'), JSON.stringify(missing, null, 2) + '\n');
console.log(`prices: ${tickers.length - missing.length}/${tickers.length} ok`, missing.map((m) => m.ticker).join(' ') || '(none missing)');
