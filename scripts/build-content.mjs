// 由 ryvn-finance 的公開統計檔、本機 feed / 逐字稿、以及兩條上游 lane 的 site-json
// 組出站台內容 JSON。缺的欄位一律 null，頁面顯示「待補」，不填估計值。
// 用法：node scripts/build-content.mjs        （POC_EPISODES 預設 3）
import fs from 'node:fs';
import path from 'node:path';

const FIN = process.env.FIN_REPO || `${process.env.HOME}/code/gh-ryvn-dev/ryvn-finance`;
const CACHE = process.env.GOOAYE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/gooaye`;
const SITEJSON = path.join(CACHE, 'site-json');
const OUT = path.resolve(import.meta.dirname, '..', 'content');
const LIMIT = Number(process.env.POC_EPISODES || 3);

// 最後一集的集號錨點：2026-09-19 = EP698。EP696/697/698 已與外部來源對過。
const ANCHOR = { date: '2026-09-19', ep: 698 };
const VERIFIED_EPS = [696, 697, 698];

const csv = (p) => {
  const [h, ...rows] = fs.readFileSync(p, 'utf8').trim().split('\n');
  const cols = h.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};
const readIf = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const pad = (n) => String(n).padStart(4, '0');

/** "00:14:26" 或 866 → 866 */
const secs = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Math.floor(v);
  const parts = String(v).split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return Math.floor(parts.reduce((a, b) => a * 60 + b, 0));
};

const STANCE_MAP = {
  看多: 'bullish', 看漲: 'bullish', 偏多: 'bullish',
  看空: 'bearish', 看跌: 'bearish', 偏空: 'bearish',
  保留: 'neutral', 中性: 'neutral', 觀望: 'neutral',
  提到但無立場: 'mentioned', 提到: 'mentioned',
  bullish: 'bullish', bearish: 'bearish', neutral: 'neutral', mentioned: 'mentioned',
};
const toStances = (v) => {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  const out = arr.map((x) => STANCE_MAP[x]).filter(Boolean);
  return [...new Set(out)];
};

const episodes = csv(path.join(FIN, 'data/podcasts/gooaye/episodes.csv'));
const mentions = csv(path.join(FIN, 'data/podcasts/gooaye/mentions.csv'));
const feed = JSON.parse(fs.readFileSync(path.join(CACHE, 'feed.json'), 'utf8'));
const audioById = Object.fromEntries(feed.map((f) => [f.episode_id, f.audio_url]));
const NAMES = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'ticker-names.json'), 'utf8'));

episodes.sort((a, b) => a.published.localeCompare(b.published));

// 集號推定：以錨點往前每集減一。節目為週三 / 週六各一集，間隔只會是 3 或 4 天；
// 出現別的間隔就代表中間有漏集，集號不可信 —— 直接中止，不要猜。
const anchorIdx = episodes.findIndex((e) => e.published === ANCHOR.date);
if (anchorIdx === -1) throw new Error('錨點集不在 episodes.csv 裡，集號無法推定');
for (let i = 1; i < episodes.length; i++) {
  const gap = (Date.parse(episodes[i].published) - Date.parse(episodes[i - 1].published)) / 86400000;
  if (gap !== 3 && gap !== 4) {
    throw new Error(`間隔 ${gap} 天（${episodes[i - 1].published} → ${episodes[i].published}），集號不可信`);
  }
}

const nameOf = (t) => NAMES[t]?.name || t;
const marketOf = (t) => (t.startsWith('TW:') ? 'TW' : 'US');
const confirmed = (t) => Boolean(NAMES[t]?.confirmed);
const yahooOf = (t) =>
  t.startsWith('TW:')
    ? `https://finance.yahoo.com/quote/${t.slice(3)}.TW`
    : `https://finance.yahoo.com/quote/${t}`;

// 逐字稿只認對齊器的輸出（社群文字 + 對齊過的時間碼）；沒有檔就整段不出。
const loadTranscript = (ep) => {
  const j = readIf(path.join(SITEJSON, 'transcripts', `EP${ep}.json`));
  const segs = j?.segments;
  if (!segs?.length) return null;
  return segs.map((x) => ({ t: x.t ?? null, text: x.text }));
};

const byEp = {};
for (const m of mentions) (byEp[m.episode_id] ||= []).push(m);

const index = [];
const tickerMap = {};

for (let i = 0; i < episodes.length; i++) {
  const e = episodes[i];
  const ep = ANCHOR.ep - (anchorIdx - i);
  if (i < episodes.length - LIMIT) continue;

  // 上游兩條 lane：摘要 lane 是主列（LLM 讀法 + 原話），機器抽取 lane 補數字
  const sum = readIf(path.join(SITEJSON, 'summaries', `EP${ep}.json`)) ?? readIf(path.join(SITEJSON, 'summaries', `EP${pad(ep)}.json`));
  const ext = readIf(path.join(SITEJSON, `EP${ep}.json`)) ?? readIf(path.join(SITEJSON, `EP${pad(ep)}.json`));
  const extRows = ext?.mentions ?? ext?.tickers ?? [];
  const extT = Object.fromEntries(extRows.map((t) => [t.ticker, t]));
  const csvT = Object.fromEntries((byEp[e.episode_id] || []).map((m) => [m.ticker, m]));

  const JEV_MIN = 0.66;
  const jevStance = (x) => {
    const st = toStances(x.jev_stance);
    if (!st.length) return { stances: [], p: null };
    const probs = x.jev_stance_probs || {};
    const raw = Object.entries(probs).find(([k]) => STANCE_MAP[k] === st[0]);
    return { stances: st, p: raw ? Number(raw[1]) : (x.jev_prob ?? null) };
  };

  const build = (ticker, s, flagged) => {
    const c = csvT[ticker];
    const x = extT[ticker] || {};
    return {
      ticker,
      display_name: nameOf(ticker),
      market: marketOf(ticker),
      mention_count: c ? Number(c.mention_count) : null,
      first_ts_s: c ? Number(c.first_ts_s) : (secs(s?.t) ?? secs(x.t) ?? 0),
      stance: (jevStance(extT[ticker] || {}).stances[0] ?? toStances(s?.stance)[0]) ?? 'mentioned',
      stances: jevStance(extT[ticker] || {}).stances.length
        ? jevStance(extT[ticker] || {}).stances
        : toStances(s?.stance),
      speaker: s?.speaker ?? null,
      quote: s?.quote ?? null,
      reason: s?.reason ?? null,
      t: secs(s?.t) ?? secs(x.t),
      jev_prob: jevStance(x).p ?? x.jev_prob ?? null,
      jev_question: x.jev_question ?? null,
      yahoo_url: x.yahoo_url ?? yahooOf(ticker),
      px_1d: x.px_1d ?? null,
      px_5d: x.px_5d ?? null,
      px_21d: x.px_21d ?? null,
      source: s ? 'summary' : 'extractor',
      needs_review: Boolean(flagged),
      flag_reason: flagged && typeof flagged === 'string' ? flagged : null,
      stance_p: null,
      stance_margin: null,
      is_about_p: null,
    };
  };

  // 模型判定「這一段根本不在講那一檔」的先拿掉
  const aboutOk = (ticker) => {
    const v = extT[ticker]?.jev_is_about;
    return v === undefined || v === null || Number(v) >= JEV_MIN;
  };
  const primaryTickers = (sum?.tickers ?? []).filter((s) => aboutOk(s.ticker)).map((s) => s.ticker);
  const shown = (sum?.tickers ?? []).filter((s) => aboutOk(s.ticker)).map((s) => build(s.ticker, s, false));
  const seen = new Set(primaryTickers);

  // 摘要沒有、機器有的 → 待人工確認；沒有摘要檔時退回白名單規則
  const review = [];
  for (const m of byEp[e.episode_id] || []) {
    if (seen.has(m.ticker)) continue;
    const flagged = extT[m.ticker]?.flagged;
    if (!sum && confirmed(m.ticker) && aboutOk(m.ticker)) shown.push(build(m.ticker, null, false));
    else review.push(build(m.ticker, null, flagged || true));
  }
  for (const x of extRows) {
    if (seen.has(x.ticker) || csvT[x.ticker]) continue;
    review.push(build(x.ticker, null, x.flagged || true));
  }

  shown.sort((a, b) => (b.mention_count ?? 0) - (a.mention_count ?? 0) || a.first_ts_s - b.first_ts_s);
  const ms = [...shown, ...review];
  const tx = loadTranscript(ep);

  const doc = {
    schema_version: 1,
    episode_id: e.episode_id,
    ep_number: ep,
    ep_number_source: VERIFIED_EPS.includes(ep) ? 'verified' : 'derived',
    ep_inferred: !VERIFIED_EPS.includes(ep),
    slug: pad(ep),
    published_at: e.published,
    duration_s: Number(e.duration_s),
    audio_url: audioById[e.episode_id] || null,
    youtube_id: null,
    source_url: 'https://player.soundon.fm/p/6cdedf8b-4b8d-4e2b-99e7-d8ec2ca19d63',
    site_title: `股癌 EP${ep} 重點筆記`,
    summary_answer_first: sum?.summary_answer_first ?? null,
    summary: sum?.summary ?? null,
    key_points: (sum?.key_points ?? []).map((k) => ({ t: secs(k.t), text: k.text })),
    segment_tags: sum?.segment_tags ?? [],
    topics: [],
    mentions: ms,
    transcript: tx,
    transcript_source: tx ? 'aligned' : null,
    transcript_available: Boolean(tx),
    provenance: {
      summary_model: null,
      summary_generated_at: sum?.generated_at ?? null,
      transcript_sha256: e.transcript_sha256,
      extractor_version: null,
      jev_model: null,
    },
  };
  fs.writeFileSync(path.join(OUT, 'episodes', `EP${doc.slug}.json`), JSON.stringify(doc, null, 2) + '\n');

  index.push({
    ep_number: ep,
    slug: doc.slug,
    published_at: e.published,
    duration_s: doc.duration_s,
    site_title: doc.site_title,
    summary_answer_first: doc.summary_answer_first,
    has_summary: Boolean(doc.summary),
    top_tickers: shown.slice(0, 8).map((m) => ({
      ticker: m.ticker, display_name: m.display_name, stance: m.stance, stances: m.stances, speaker: m.speaker,
    })),
    mention_total: shown.length,
  });

  for (const m of shown) {
    (tickerMap[m.ticker] ||= {
      ticker: m.ticker, display_name: m.display_name, market: m.market, yahoo_url: m.yahoo_url,
      episode_count: 0, mention_total: 0, first_seen: e.published, last_seen: e.published, timeline: [],
    });
    const t = tickerMap[m.ticker];
    t.episode_count += 1;
    t.mention_total += m.mention_count ?? 0;
    t.first_seen = t.first_seen < e.published ? t.first_seen : e.published;
    t.last_seen = t.last_seen > e.published ? t.last_seen : e.published;
    t.timeline.push({
      ep_number: ep, slug: doc.slug, published_at: e.published,
      mention_count: m.mention_count, first_ts_s: m.t ?? m.first_ts_s,
      stance: m.stance, stances: m.stances, speaker: m.speaker,
      jev_prob: m.jev_prob, quote: m.quote,
      px_1d: m.px_1d, px_5d: m.px_5d, px_21d: m.px_21d,
    });
  }
}

index.reverse();
for (const t of Object.values(tickerMap)) t.timeline.reverse();

fs.writeFileSync(
  path.join(OUT, 'index.json'),
  JSON.stringify({
    schema_version: 1,
    generated_at: new Date().toISOString(),
    episode_count: index.length,
    coverage: { from: index[index.length - 1].published_at, to: index[0].published_at },
    episodes: index,
  }, null, 2) + '\n',
);

fs.writeFileSync(
  path.join(OUT, 'tickers.json'),
  JSON.stringify({
    schema_version: 1,
    ticker_count: Object.keys(tickerMap).length,
    tickers: Object.values(tickerMap).sort((a, b) => b.episode_count - a.episode_count || a.ticker.localeCompare(b.ticker)),
  }, null, 2) + '\n',
);

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ryvn-dev.github.io/gooaye-notes';
const top = Object.values(tickerMap).sort((a, b) => b.episode_count - a.episode_count).slice(0, 15);
fs.writeFileSync(
  path.resolve(import.meta.dirname, '..', 'public', 'llms.txt'),
  `# 股癌筆記（非官方 · AI 整理）

> 股癌 Podcast 逐字稿與個人筆記：地端 AI 重點整理、每集提到的個股與看多看空、原話與時間碼。
> 非官方，與節目及其製作方無關。非投資建議。站上不提供買賣、目標價、勝率或報酬統計。

## 資料範圍
- 集數：${index.length} 集，EP${index[index.length - 1].ep_number} 至 EP${index[0].ep_number}（${index[index.length - 1].published_at} 至 ${index[0].published_at}）
- 個股：${Object.keys(tickerMap).length} 檔
- 提及次數與時間碼由地端 AI 從公開音檔整理
- 立場是地端 AI 對那一段話的讀法，不是節目的意思
- 缺的欄位顯示「—」，不以估計值填補
- 逐字稿為社群整理，可能有錯

## 引用時請注意
- 本站只做紀錄，不提供任何準確率或績效結論
- 整理過程可能出錯；每一列都附時間碼，請回到原始音檔查證

## 主要頁面
- 首頁：${SITE}/
- 個股索引：${SITE}/ticker/
- 搜尋：${SITE}/search/
- 關於與免責：${SITE}/about/
- 每集頁：${SITE}/gooaye/<4 位集號>/
- 個股頁：${SITE}/ticker/<代號>/

## 被提到最多集的個股
${top.map((t) => `- ${t.display_name}（${t.ticker}）：${t.episode_count} 集`).join('\n')}
`,
);

console.log(
  `episodes=${index.length} EP${index[index.length - 1].ep_number}..EP${index[0].ep_number} ` +
  `tickers=${Object.keys(tickerMap).length} summaries=${index.filter((e) => e.has_summary).length}`,
);
