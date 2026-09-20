// 從 ryvn-finance 的公開統計檔（episodes.csv / mentions.csv）與本機 feed.json
// 組出站台內容 JSON。逐字稿一個位元組都不進這個 repo。
// 用法：node scripts/build-content.mjs
import fs from 'node:fs';
import path from 'node:path';

const FIN = process.env.FIN_REPO || `${process.env.HOME}/code/gh-ryvn-dev/ryvn-finance`;
const CACHE = process.env.GOOAYE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/gooaye`;
const OUT = path.resolve(import.meta.dirname, '..', 'content');

// 最後一集的集號錨點：2026-09-19 = EP698（Issac 競品研究 2026-09-21 [observed]）
const ANCHOR = { date: '2026-09-19', ep: 698 };

const csv = (p) => {
  const [h, ...rows] = fs.readFileSync(p, 'utf8').trim().split('\n');
  const cols = h.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};

const episodes = csv(path.join(FIN, 'data/podcasts/gooaye/episodes.csv'));
const mentions = csv(path.join(FIN, 'data/podcasts/gooaye/mentions.csv'));
const feed = JSON.parse(fs.readFileSync(path.join(CACHE, 'feed.json'), 'utf8'));
const audioById = Object.fromEntries(feed.map((f) => [f.episode_id, f.audio_url]));

episodes.sort((a, b) => a.published.localeCompare(b.published));

// 集號推定：以錨點往前每集減一。節目為週三 / 週六各一集，間隔只會是 3 或 4 天；
// 出現別的間隔就代表中間有漏集，集號不可信 —— 直接中止，不要猜。
const anchorIdx = episodes.findIndex((e) => e.published === ANCHOR.date);
if (anchorIdx === -1) throw new Error('錨點集不在 episodes.csv 裡，集號無法推定');
for (let i = 1; i < episodes.length; i++) {
  const gap = (Date.parse(episodes[i].published) - Date.parse(episodes[i - 1].published)) / 86400000;
  if (gap !== 3 && gap !== 4) throw new Error(`間隔 ${gap} 天（${episodes[i - 1].published} → ${episodes[i].published}），集號不可信`);
}

const NAMES = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'ticker-names.json'), 'utf8'));
const pad = (n) => String(n).padStart(4, '0');
const nameOf = (t) => NAMES[t]?.name || t;
// 白名單外的代號一律當「待人工確認」：抽取器已知會把 CP 值一類的詞當成股票（RF-1099）。
// 這些列照常出現在集頁（標待確認），但不進代號頁 —— 不猜、也不擋整集。
const confirmed = (t) => Boolean(NAMES[t]?.confirmed);
const marketOf = (t) => (t.startsWith('TW:') ? 'TW' : 'US');

const byEp = {};
for (const m of mentions) (byEp[m.episode_id] ||= []).push(m);

const index = [];
const tickerMap = {};

for (let i = 0; i < episodes.length; i++) {
  const e = episodes[i];
  const ep = ANCHOR.ep - (anchorIdx - i);
  const slug = pad(ep);
  const ms = (byEp[e.episode_id] || [])
    .map((m) => ({
      ticker: m.ticker,
      display_name: nameOf(m.ticker),
      market: marketOf(m.ticker),
      mention_count: Number(m.mention_count),
      first_ts_s: Number(m.first_ts_s),
      // v1 沒有 stance 模型輸出 → 一律「提到但無立場」，不猜方向。
      stance: 'mentioned',
      stance_p: null,
      stance_margin: null,
      is_about_p: null,
      source: 'extractor',
      needs_review: !confirmed(m.ticker),
      // 以下欄位等 stance / 摘要 / 價格三條線的真資料，v1 一律 null，UI 顯示「待補」
      stances: [],
      jev_prob: null,
      jev_question: null,
      quote: null,
      t: null,
      yahoo_url: m.ticker.startsWith('TW:')
        ? `https://finance.yahoo.com/quote/${m.ticker.slice(3)}.TW`
        : `https://finance.yahoo.com/quote/${m.ticker}`,
      px_1d: null,
      px_5d: null,
      px_21d: null,
    }))
    .sort((a, b) => b.mention_count - a.mention_count || a.first_ts_s - b.first_ts_s);

  const top3 = ms.slice(0, 3).map((m) => m.display_name);
  const doc = {
    schema_version: 1,
    episode_id: e.episode_id,
    ep_number: ep,
    ep_number_source: 'derived',
    slug,
    published_at: e.published,
    duration_s: Number(e.duration_s),
    audio_url: audioById[e.episode_id] || null,
    youtube_id: null,
    source_url: 'https://player.soundon.fm/p/6cdedf8b-4b8d-4e2b-99e7-d8ec2ca19d63',
    site_title: `股癌 EP${ep} 重點筆記`,
    summary_answer_first: null,
    summary: null,
    key_points: [],
    segment_tags: [],
    topics: [],
    mentions: ms,
    transcript: null,
    transcript_available: false,
    provenance: {
      summary_model: null,
      summary_generated_at: null,
      transcript_sha256: e.transcript_sha256,
      extractor_version: 'podcast:extract@RF-1099',
      jev_model: null,
    },
  };
  fs.writeFileSync(path.join(OUT, 'episodes', `EP${slug}.json`), JSON.stringify(doc, null, 2) + '\n');

  index.push({
    ep_number: ep, slug, published_at: e.published, duration_s: doc.duration_s,
    site_title: doc.site_title, summary_answer_first: null, has_summary: false,
    top_tickers: ms.slice(0, 5).map((m) => ({ ticker: m.ticker, display_name: m.display_name, stance: m.stance })),
    mention_total: ms.length,
  });

  for (const m of ms) {
    if (m.needs_review) continue;
    (tickerMap[m.ticker] ||= {
      ticker: m.ticker, display_name: m.display_name, market: m.market, yahoo_url: m.yahoo_url,
      episode_count: 0, mention_total: 0, first_seen: e.published, last_seen: e.published, timeline: [],
    });
    const t = tickerMap[m.ticker];
    t.episode_count += 1;
    t.mention_total += m.mention_count;
    t.first_seen = t.first_seen < e.published ? t.first_seen : e.published;
    t.last_seen = t.last_seen > e.published ? t.last_seen : e.published;
    t.timeline.push({ ep_number: ep, slug, published_at: e.published, mention_count: m.mention_count, first_ts_s: m.first_ts_s, stance: m.stance, stances: [], jev_prob: null, quote: null, px_1d: null, px_5d: null, px_21d: null });
  }
}

index.reverse();
for (const t of Object.values(tickerMap)) t.timeline.reverse();

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({
  schema_version: 1,
  generated_at: new Date().toISOString(),
  episode_count: index.length,
  coverage: { from: episodes[0].published, to: episodes[episodes.length - 1].published },
  episodes: index,
}, null, 2) + '\n');

fs.writeFileSync(path.join(OUT, 'tickers.json'), JSON.stringify({
  schema_version: 1,
  ticker_count: Object.keys(tickerMap).length,
  tickers: Object.values(tickerMap).sort((a, b) => b.episode_count - a.episode_count || a.ticker.localeCompare(b.ticker)),
}, null, 2) + '\n');

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ryvn-dev.github.io/gooaye-notes';
const top = Object.values(tickerMap).sort((a, b) => b.episode_count - a.episode_count).slice(0, 15);
fs.writeFileSync(path.resolve(import.meta.dirname, '..', 'public', 'llms.txt'), `# 股癌筆記（非官方 · AI 整理）

> 股癌 podcast 的第三方整理：每一集提到哪幾檔個股、提到幾次、講在第幾分幾秒。
> 非官方，與節目及其製作方無關。非投資建議。站上不提供買賣、目標價、勝率或報酬統計。

## 資料範圍
- 集數：${index.length} 集，EP${index[index.length - 1].slug} 至 EP${index[0].slug}（${episodes[0].published} 至 ${episodes[episodes.length - 1].published}）
- 個股：${Object.keys(tickerMap).length} 檔（已排除疑似誤抓的代號）
- 提及次數與時間碼為程式從公開音檔的自動轉寫抽出 [observed]
- 多空立場、AI 摘要、提到後 1／5／21 日價格變化：尚未產出，站上顯示「待補」，不以估計值填補
- 集號由發布日推定（節目為每週三、週六各一集），未逐集與官方編號核對
- 全文逐字稿不在本站

## 引用時請注意
- 樣本 n=${index.length} 集，樣本不足，不得據此做出準確率或績效結論
- 自動轉寫與代號抽取都可能出錯；每一列都附時間碼，請回到原始音檔查證

## 主要頁面
- 首頁：${SITE}/
- 個股索引：${SITE}/ticker/
- 搜尋：${SITE}/search/
- 關於與免責：${SITE}/about/
- 每集頁：${SITE}/gooaye/<4 位集號>/
- 個股頁：${SITE}/ticker/<代號>/

## 被提到最多集的個股
${top.map((t) => `- ${t.display_name}（${t.ticker}）：${t.episode_count} 集、${t.mention_total} 次`).join('\n')}
`);

console.log(`episodes=${index.length} EP${index[index.length - 1].slug}..EP${index[0].slug} tickers=${Object.keys(tickerMap).length}`);
