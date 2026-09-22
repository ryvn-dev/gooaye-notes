// 由 ryvn-finance 的公開統計檔、本機 feed / 逐字稿、以及兩條上游 lane 的 site-json
// 組出站台內容 JSON。缺的欄位一律 null，頁面顯示「待補」，不填估計值。
// 用法：node scripts/build-content.mjs        （POC_EPISODES 預設 3）
import fs from 'node:fs';
import path from 'node:path';
import { checkEpisode } from './check-structured.mjs';
import { mentionsTicker } from './aliases.mjs';
import { SHOWS, displayModeOf, showById } from './episode_ingest/sources.mjs';
import { parseStructured } from './episode_ingest/blocks.mjs';
import { splitSentences } from './sentences.mjs';

const FIN = process.env.FIN_REPO || `${process.env.HOME}/code/gh-ryvn-dev/ryvn-finance`;
const OUT = path.resolve(import.meta.dirname, '..', 'content');

// 節目登記表只有一份：`scripts/episode_ingest/sources.mjs`。
// 這裡曾經有第二份一模一樣的常數（計畫 §B6.1），改一邊就會不一致。
//
// **這一支對每個 `ingested: true` 的節目各跑一輪**，`content/tickers.json` 是
// **跨節目**以代號為鍵的一份（同一檔 × 多個節目 × 什麼時候改口 —— 那是這個站的定位）。
// 今天只有股癌是 `ingested`，所以輸出跟單節目時代一模一樣。
// `SHOW_ID` 只是把範圍縮到一個節目，給除錯用。
const ONLY = process.env.SHOW_ID ? showById(process.env.SHOW_ID) : null;
if (process.env.SHOW_ID && !ONLY) throw new Error(`沒有這個節目：${process.env.SHOW_ID}`);
const IN_SITE = (ONLY ? [ONLY] : SHOWS).filter((s2) => s2.ingested);
if (!IN_SITE.length) throw new Error('沒有任何 ingested 的節目');
const LIMIT = Number(process.env.POC_EPISODES || 0) || null;

// 以下這幾個綁在「現在在跑哪一個節目」上，由 `loadShow()` 換掉。
let SHOW; let DISPLAY; let CACHE; let SITEJSON; let SUM_INDEX;
let episodes; let mentions; let audioById; let TITLES; let LINKS; let feedNums; let byEp;

const csv = (p) => {
  const [h, ...rows] = fs.readFileSync(p, 'utf8').trim().split('\n');
  const cols = h.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};
const readIf = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const pad = (n) => String(n).padStart(4, '0');
/** 摘要句首的「簡單說：」「簡單講：」是 lane 的口頭禪，站上不出現。 */
const noLead = (v) => (typeof v === 'string' ? v.replace(/^\s*(簡單說|簡單講)\s*[：:，,]?\s*/, '') : v);

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

const NAMES = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'ticker-names.json'), 'utf8'));

const feedTitle = (id) => {
  const raw = TITLES[id]?.title;
  if (!raw) return null;
  // 主人 2026-09-21 拍板：標題用 RSS 原標逐字（含 emoji），不加字也不去字。
  return String(raw).trim() || null;
};
const feedEpNo = (id) => {
  const n = Number(TITLES[id]?.itunes_episode);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// 順序一律由 RSS 的日期決定；集號一律由 feed 的 `itunes:episode` 決定。
// 這裡以前是「錨點 EP698 往前每集減一，而且相鄰兩集間隔必須是 3 或 4 天，否則 throw」——
// 節目休一次、或 feed 補一集舊的，整條 build 就紅（計畫 §A2.7、§B2）。
// 現在：feed 沒寫集號的那幾集才由日期序往鄰居推；間隔不規則**只警告**。
const WARNINGS = [];
const deriveEp = (i) => {
  for (let j = i - 1; j >= 0; j--) if (feedNums[j] !== null) return feedNums[j] + (i - j);
  for (let j = i + 1; j < episodes.length; j++) if (feedNums[j] !== null) return feedNums[j] - (j - i);
  return null;
};

/** 換到某一個節目：它的快取、它的集數帳、它的 feed。 */
const loadShow = (show) => {
  SHOW = show;
  DISPLAY = displayModeOf(show);
  CACHE = show.cache;
  SITEJSON = path.join(CACHE, 'site-json');
  // 站上只放「摘要 lane 審過」的集數：summaries/index.json 就是那張清單。
  SUM_INDEX = (() => {
    const j = readIf(path.join(SITEJSON, 'summaries', 'index.json'));
    return j ? new Set((j.episodes ?? []).map((e) => Number(String(e.ep).replace(/\D/g, '')))) : null;
  })();
  episodes = csv(path.join(show.stats, 'episodes.csv'));
  mentions = fs.existsSync(path.join(show.stats, 'mentions.csv')) ? csv(path.join(show.stats, 'mentions.csv')) : [];
  const feed = JSON.parse(fs.readFileSync(path.join(CACHE, 'feed.json'), 'utf8'));
  audioById = Object.fromEntries(feed.map((f) => [f.episode_id, f.audio_url]));
  TITLES = readIf(path.join(CACHE, 'titles.json')) ?? {};
  LINKS = readIf(path.join(CACHE, 'links.json')) ?? {};
  byEp = {};
  for (const m of mentions) (byEp[m.episode_id] ||= []).push(m);

  // 順序一律由 RSS 的日期決定；集號一律由 feed 的 `itunes:episode` 決定。
  episodes.sort((a, b) => a.published.localeCompare(b.published));
  feedNums = episodes.map((e) => feedEpNo(e.episode_id));
  if (feedNums.every((n) => n === null)) {
    throw new Error(`${show.id}：feed 一集都沒有 itunes:episode —— 先跑 npm run podcast:fetch`);
  }
  for (let i = 1; i < episodes.length; i++) {
    const gap = (Date.parse(episodes[i].published) - Date.parse(episodes[i - 1].published)) / 86400000;
    if (gap !== 3 && gap !== 4) {
      WARNINGS.push(`${show.id} 間隔 ${gap} 天（${episodes[i - 1].published} → ${episodes[i].published}）：節目休停或 feed 補舊集都會這樣，集號以 feed 為準`);
    }
  }
};

const STATS = [];
const nameOf = (t) => NAMES[t]?.name || t;
// 站上認得名字的代號：逐字稿別名掃描掃的就是這一份。
const ALL_TICKERS = Object.keys(NAMES).filter((t) => NAMES[t]?.confirmed);
// chip 與 tooltip 上的簡稱：代碼旁邊一定要有名字，不然讀者看到 3661 不知道是世芯。
const shortOf = (t) => NAMES[t]?.short || NAMES[t]?.name || null;
const marketOf = (t) => (t.startsWith('TW:') ? 'TW' : 'US');
const confirmed = (t) => Boolean(NAMES[t]?.confirmed);
const yahooOf = (t) =>
  t.startsWith('TW:')
    ? `https://finance.yahoo.com/quote/${t.slice(3)}.TW`
    : `https://finance.yahoo.com/quote/${t}`;

// 逐字稿只認對齊器的輸出（社群文字 + 對齊過的時間碼），而且只認結構化過的那一份。
// 結構化：社群稿本身就是 markdown（標題、引用），再把口語碎句併成 150–350 字的段落，
// 產出 EP<n>.structured.md（scripts/structure-transcript.mjs）。內文一個字都不改，
// build 時跑相等閘門（scripts/check-structured.mjs），不等就讓 build 失敗。
// 解析用庫：unified + remark-parse + remark-directive（`:::ad` 代言段）。
const loadStructured = (ep) => {
  const f = path.join(SITEJSON, 'transcripts', `EP${ep}.structured.md`);
  if (!fs.existsSync(f)) return null;
  const gate = checkEpisode(ep);
  if (!gate.ok) {
    throw new Error(
      `EP${ep} 結構化逐字稿與社群稿不相等（第 ${gate.at} 字起）\n  稿: ${gate.src}\n  站: ${gate.md}`,
    );
  }
  // 段序＝立場錨點 p-<n>，口徑與摘要腳本共用 `episode_ingest/blocks.mjs`。
  const out = parseStructured(fs.readFileSync(f, 'utf8'));
  return out.length ? out : null;
};

// ── 句子層 ─────────────────────────────────────────────────────────────────
// 螢光筆的來源是摘要 schema v2：每檔每段一筆 { p, stance, quote }，quote 逐字比對出那一句。
// 重點句同樣是黃底；tap／hover 出現 tooltip（代碼 + 立場 icon）。

const buildTranscript = (blocks, sum, rows, scanTickers = []) => {
  if (!blocks?.length) return null;

  // 先把每一段切成句子，句子在集內的座標是 `${blockIndex}:${sentenceIndex}`。
  const sents = [];
  const body = blocks.map((b, bi) => {
    if (b.kind === 'h2' || b.ad) return { ...b, sentences: [] };
    const list = splitSentences(b.text);
    list.forEach((text, si) => sents.push({ bi, si, t: si === 0 ? b.t ?? null : null, text, chars: text.length }));
    return { ...b, sentences: list.map((text) => ({ text, key_point: null, marks: [] })) };
  });

  // 段落合併之後，一段可能橫跨一分多鐘，用段首時間去對重點會對不到。
  // 以字數在兩個已知時間點之間線性內插，估每一句的時間（只用來配對，站上不顯示）。
  let cum = 0;
  for (const s of sents) { s.at = cum; cum += s.chars; }
  const anchors = sents.filter((s) => s.t !== null);
  for (const s of sents) {
    if (s.t !== null) { s.t_est = s.t; continue; }
    const prev = [...anchors].reverse().find((a) => a.at <= s.at);
    const next = anchors.find((a) => a.at > s.at);
    if (prev && next && next.at > prev.at) {
      s.t_est = prev.t + ((next.t - prev.t) * (s.at - prev.at)) / (next.at - prev.at);
    } else s.t_est = prev?.t ?? next?.t ?? null;
  }

  const bigrams = (t) => {
    const c = t.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '');
    const set = new Set();
    for (let i = 0; i < c.length - 1; i++) set.add(c.slice(i, i + 2));
    return set;
  };
  const recall = (kp, sent) => {
    if (!kp.size) return 0;
    let n = 0;
    for (const g of kp) if (sent.has(g)) n++;
    return n / kp.size;
  };
  const sentBi = new Map(sents.map((s) => [s, bigrams(s.text)]));
  const bare = (t) => t.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '');

  /** 在指定段裡找出 quote 是哪一句：先逐字包含，再退回 bigram recall。 */
  const findInBlock = (bi, quote) => {
    const cand = sents.filter((s) => s.bi === bi);
    if (!cand.length) return null;
    const q = bare(quote);
    if (q) {
      const exact = cand.find((s) => bare(s.text).includes(q) || q.includes(bare(s.text)));
      if (exact) return exact;
    }
    const kb = bigrams(quote);
    const best = cand.map((s) => ({ s, r: recall(kb, sentBi.get(s)) })).sort((a, b) => b.r - a.r)[0];
    return best && best.r >= 0.25 ? best.s : null;
  };

  // 螢光筆一：摘要 lane 的每一筆（每檔每段一筆）就是那一段要標的那一句。
  // needs_review 的筆只顯示灰點（無方向），引用段（來信）本來就不出 tickers。
  // 立場句常常不提公司名（「整體看下來是一個不錯的訊息」），標在那裡讀者對不起來：
  // 改標到同一段裡離它最近、真的講到這檔的那一句；整段都沒提就不標。
  const nearestNamed = (bi, from, ticker) => {
    const cand = sents.filter((s) => s.bi === bi && mentionsTicker(s.text, ticker));
    if (!cand.length) return null;
    return cand.sort((a, b) => Math.abs(a.si - from.si) - Math.abs(b.si - from.si) || a.si - b.si)[0];
  };
  let marked = 0;
  let missed = 0;
  let unnamed = 0;
  // 沒有段號的集數（摘要 lane 給的是純原話）：整集找那一句，門檻拉高避免亂對。
  const findAnywhere = (quote) => {
    const q = bare(quote);
    if (q.length >= 8) {
      const exact = sents.find((x) => bare(x.text).includes(q) || (bare(x.text).length >= 8 && q.includes(bare(x.text))));
      if (exact) return exact;
    }
    const kb = bigrams(quote);
    const best = sents
      .filter((x) => x.text.length >= 8)
      .map((x) => ({ s: x, r: recall(kb, sentBi.get(x)) }))
      .sort((a, b) => b.r - a.r)[0];
    return best && best.r >= 0.5 ? best.s : null;
  };

  for (const r of rows) {
    const pi = typeof r.p === 'string' && r.p.startsWith('p-') ? Number(r.p.slice(2)) : null;
    const locator = r.locator ?? r.quote;
    if (!locator) continue;
    if (pi !== null && (!body[pi] || body[pi].kind === 'quote')) continue;
    const found = pi === null ? findAnywhere(locator) : findInBlock(pi, locator);
    if (!found) { missed++; continue; }
    const bi = found.bi;
    if (body[bi].kind === 'quote' || body[bi].ad) { missed++; continue; }
    const hit = mentionsTicker(found.text, r.ticker) ? found : nearestNamed(bi, found, r.ticker);
    if (!hit) { unnamed++; continue; }
    const cell = body[hit.bi].sentences[hit.si];
    if (cell.marks.some((m) => m.ticker === r.ticker)) continue;
    cell.marks.push({ ticker: r.ticker, stance: r.needs_review ? 'neutral' : r.stance });
    marked++;
  }

  // 螢光筆一之二：有立場的段落之外，其他講到這些公司的句子標成「提到」（灰點）。
  // 引用段（來信原文）不標；同一段同一檔最多一句。
  // 掃的是站上認得的**所有**代號，不只這一集立場列那幾檔 ——
  // 讀者數的「這一集講到幾檔」是他真的講出口的那些（主人 2026-09-21 09:42）。
  let aliasMarks = 0;
  for (const [bi, b] of body.entries()) {
    if (b.kind !== 'p' || b.ad || !b.sentences.length) continue;
    for (const ticker of scanTickers) {
      if (b.sentences.some((s) => s.marks.some((m) => m.ticker === ticker))) continue;
      const si = b.sentences.findIndex((s) => mentionsTicker(s.text, ticker, { namesOnly: true }));
      if (si < 0) continue;
      b.sentences[si].marks.push({ ticker, stance: 'mentioned' });
      aliasMarks++;
      void bi;
    }
  }

  // 「相關個股」跳到全集第一個標到這一檔的句子。
  const anchor = {};
  for (const [bi, b] of body.entries()) {
    b.sentences.forEach((s, si) => {
      for (const m of s.marks) if (anchor[m.ticker] === undefined) anchor[m.ticker] = `s-${bi}-${si}`;
    });
  }

  // 螢光筆二：重點 → 句子。有 p 就只在那一段裡找；沒有 p（舊格式）才退回時間窗 + 分離度。
  const MIN_R = 0.3;
  const kps = (sum?.key_points ?? []).map((k, i) => ({ i, t: secs(k.t), text: noLead(k.text), p: k.p ?? null }));
  let kpHits = 0;
  for (const kp of kps) {
    const pi = typeof kp.p === 'string' && kp.p.startsWith('p-') ? Number(kp.p.slice(2)) : null;
    if (pi !== null && body[pi] && body[pi].sentences.length) {
      const kb = bigrams(kp.text);
      const cand = sents.filter((s) => s.bi === pi).map((s) => ({ s, r: recall(kb, sentBi.get(s)) })).sort((a, b) => b.r - a.r);
      const best = cand[0];
      if (best && (best.r >= 0.15 || cand.length === 1)) {
        body[best.s.bi].sentences[best.s.si].key_point = kp.i;
        kpHits++;
      }
      continue;
    }
    if (kp.t === null) continue;
    const kb = bigrams(kp.text);
    const cand = sents
      .filter((s) => s.t_est !== null && Math.abs(s.t_est - kp.t) <= 60 && s.text.length >= 8)
      .map((s) => ({ s, r: recall(kb, sentBi.get(s)) }))
      .sort((a, b) => b.r - a.r);
    const best = cand[0];
    const second = cand[1];
    if (!best || best.r < MIN_R) continue;
    const take = [best];
    if (second && second.r >= best.r * 0.9) {
      const adjacent = second.s.bi === best.s.bi && Math.abs(second.s.si - best.s.si) === 1;
      if (!adjacent) continue;
      take.push(second);
    }
    for (const c of take) body[c.s.bi].sentences[c.s.si].key_point = kp.i;
    kpHits++;
  }

  const markedTotal = body.reduce(
    (a, b) => a + b.sentences.filter((s) => s.key_point !== null || s.marks.length).length,
    0,
  );
  // 無標題區：不在任何小標底下的字數占比（稽核 F §2，>25% 就讓 build 紅）。
  let untitled = 0;
  let total = 0;
  let titled = false;
  for (const b of body) {
    if (b.kind === 'h2') { titled = true; continue; }
    total += b.text.length;
    if (!titled) untitled += b.text.length;
  }
  return {
    blocks: body,
    anchor,
    heading_count: body.filter((b) => b.kind === 'h2').length,
    quote_count: body.filter((b) => b.kind === 'quote').length,
    ad_count: body.filter((b) => b.ad).length,
    marked_count: markedTotal,
    ticker_marks: marked,
    ticker_missed: missed,
    ticker_unnamed: unnamed,
    alias_marks: aliasMarks,
    key_point_hits: kpHits,
    key_point_count: kps.length,
    untitled_share: total ? untitled / total : 0,
    chars: total,
  };
};

// ── 提及之後的漲跌（build 時算好，前端不打 API） ───────────────────────────
const PRICES = {};
const priceRows = (ticker) => {
  if (PRICES[ticker] !== undefined) return PRICES[ticker];
  const f = path.resolve(import.meta.dirname, '..', 'content', 'prices', `${ticker.replace(/[.:]/g, '-')}.json`);
  PRICES[ticker] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).rows : null;
  return PRICES[ticker];
};
const pctOf = (a, b) => (a && b ? Number((((b - a) / a) * 100).toFixed(1)) : null);
const perfOf = (ticker, date) => {
  const rows = priceRows(ticker);
  if (!rows?.length) return null;
  const i = rows.findIndex((r) => r.d >= date);
  if (i === -1) return null;
  const base = rows[i];
  const last = rows[rows.length - 1];
  const at = (n) => (i + n < rows.length ? rows[i + n] : null);
  return {
    base_date: base.d,
    base: base.c,
    last_date: last.d,
    last: last.c,
    pct: pctOf(base.c, last.c),
    d5: at(5) ? pctOf(base.c, at(5).c) : null,
    d21: at(21) ? pctOf(base.c, at(21).c) : null,
  };
};

const index = [];
const tickerMap = {};

for (const show of IN_SITE) {
loadShow(show);
for (let i = 0; i < episodes.length; i++) {
  const e = episodes[i];
  const fromFeed = feedNums[i];
  const ep = fromFeed ?? deriveEp(i);
  if (ep === null) throw new Error(`EP 集號推不出來：${e.episode_id}（${e.published}）`);
  if (SUM_INDEX ? !SUM_INDEX.has(ep) : LIMIT && i < episodes.length - LIMIT) continue;

  // 上游兩條 lane：摘要 lane 是主列（LLM 讀法 + 原話），機器抽取 lane 補數字
  const sum = readIf(path.join(SITEJSON, 'summaries', `EP${ep}.json`)) ?? readIf(path.join(SITEJSON, 'summaries', `EP${pad(ep)}.json`));
  const ext = readIf(path.join(SITEJSON, `EP${ep}.json`)) ?? readIf(path.join(SITEJSON, `EP${pad(ep)}.json`));
  const extRows = ext?.mentions ?? ext?.tickers ?? [];
  const extT = Object.fromEntries(extRows.map((t) => [t.ticker, t]));
  const csvT = Object.fromEntries((byEp[e.episode_id] || []).map((m) => [m.ticker, m]));

  const JEV_MIN = 0.7;
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
      short_name: shortOf(ticker),
      market: marketOf(ticker),
      mention_count: c ? Number(c.mention_count) : null,
      first_ts_s: c ? Number(c.first_ts_s) : (secs(s?.t) ?? secs(x.t) ?? 0),
      // 立場以摘要 lane（審過的那一份）為準；摘要沒寫才退回機器抽取的讀法。
      stance: (toStances(s?.stance)[0] ?? jevStance(extT[ticker] || {}).stances[0]) ?? 'mentioned',
      stances: toStances(s?.stance).length ? toStances(s?.stance) : jevStance(extT[ticker] || {}).stances,
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
      publish: Boolean(s),
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

  // schema v2：tickers[] 是「每檔每段一筆」。站上每檔只出現一次 ——
  // 立場取各段的多數，平手或全部待覆核就是灰點（無方向）；needs_review 的那一筆不投方向票。
  const rowsRaw = (sum?.tickers ?? []).map((r) => ({
    ...r,
    stance: toStances(r.stance)[0] ?? 'mentioned',
    needs_review: Boolean(r.needs_review),
    // quote_publishable: false（原話取自我們自己的稿）→ 原話不上站，
    // 但仍拿來「定位」要螢光的是哪一句；站上顯示的字一律是逐字稿本身。
    quote: r.quote_publishable === false ? null : (r.quote ?? null),
    locator: r.quote ?? null,
  }));
  const byTicker = new Map();
  for (const r of rowsRaw) {
    if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []);
    byTicker.get(r.ticker).push(r);
  }
  // 同一集他對同一檔講過兩個方向 → mixed（雙向箭頭），不投票；
  // 多數決只用在「單一方向 ＋ 無立場」那種情況（審查者 2026-09-21 09:32 拍）。
  const majority = (rows) => {
    const dirs = new Set(
      rows.filter((r) => !r.needs_review).map((r) => r.stance).filter((s) => s === 'bullish' || s === 'bearish'),
    );
    if (dirs.size === 2) return 'mixed';
    const tally = {};
    for (const r of rows) {
      const st = r.needs_review ? 'neutral' : r.stance;
      tally[st] = (tally[st] ?? 0) + 1;
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return 'neutral';
    return sorted[0][0];
  };
  const shown = [...byTicker.entries()].map(([ticker, rows]) => {
    const lead = rows.find((r) => !r.needs_review && r.quote) ?? rows.find((r) => r.quote) ?? rows[0];
    const m = build(ticker, lead, false);
    m.stance = majority(rows);
    m.stances =
      m.stance === 'mixed'
        ? ['bullish', 'bearish']
        : [m.stance];
    m.row_count = rows.length;
    m.needs_review = rows.every((r) => r.needs_review);
    return m;
  });
  const seen = new Set(byTicker.keys());

  // 摘要沒有、機器有的 → 不上站（抽取層稽核只有 4/23 正確）；沒有摘要檔時退回白名單規則
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

  // 有方向的排最前面，接著是摘要有列但沒方向的，最後才是只有逐字稿掃到的「提到」。
  const dirRank = (m) =>
    m.stance === 'bullish' || m.stance === 'bearish' || m.stance === 'mixed' ? 0 : m.source === 'transcript' ? 2 : 1;
  const chipSort = (a, b) =>
    dirRank(a) - dirRank(b) || (b.mention_count ?? 0) - (a.mention_count ?? 0) || a.first_ts_s - b.first_ts_s;
  shown.sort(chipSort);
  for (const m of shown) m.perf = perfOf(m.ticker, e.published);
  const tx = loadStructured(ep);
  // 掃描名單 = 這一集立場列 ∪ 站上認得的代號（確認過名字的那些）
  const scanList = [...new Set([...shown.map((m) => m.ticker), ...ALL_TICKERS])];
  const structured = buildTranscript(tx, sum, rowsRaw, scanList);
  if (structured) {
    // 逐字稿裡真的講到、但摘要那一列沒有的 → 補一筆「提到」（灰點），排在有方向的後面。
    const marked = new Map();
    structured.blocks.forEach((b, bi) =>
      b.sentences.forEach((sn) =>
        sn.marks.forEach((mk) => {
          if (!marked.has(mk.ticker)) marked.set(mk.ticker, { count: 0, t: b.t ?? null });
          marked.get(mk.ticker).count += 1;
        }),
      ),
    );
    for (const [ticker, info] of marked) {
      if (shown.some((m) => m.ticker === ticker)) continue;
      const m = build(ticker, null, false);
      m.publish = true;
      m.source = 'transcript';
      m.stance = 'mentioned';
      m.stances = ['mentioned'];
      m.row_count = 0;
      m.needs_review = false;
      m.quote = null;
      m.mention_count = info.count;
      m.t = info.t;
      m.first_ts_s = info.t ?? 0;
      shown.push(m);
    }
    shown.sort(chipSort);
    for (const m of shown) if (!m.perf) m.perf = perfOf(m.ticker, e.published);
    for (const m of shown) m.first_anchor = structured.anchor[m.ticker] ?? null;
    const ps = structured.blocks.filter((b) => b.kind === 'p' && !b.ad);
    const avg = Math.round(ps.reduce((a, b) => a + b.text.length, 0) / Math.max(1, ps.length));
    STATS.push(
      `EP${ep} 小標=${structured.heading_count} 段=${ps.length}（平均${avg}字） 引用=${structured.quote_count} ` +
        `代言段=${structured.ad_count} 螢光句=${structured.marked_count}（立場 ${structured.ticker_marks}、提到 ${structured.alias_marks}、` +
        `對不到 ${structured.ticker_missed}、整段沒提名 ${structured.ticker_unnamed}） ` +
        `重點命中=${structured.key_point_hits}/${structured.key_point_count} ` +
        `無標題區=${Math.round(structured.untitled_share * 100)}%`,
    );
    if (structured.untitled_share > 0.25) {
      throw new Error(`EP${ep} 無標題區 ${Math.round(structured.untitled_share * 100)}%（>25%）：小標不足`);
    }
  }

  // 站上放全文還是只放引用（`transcript_display`，2026-09-23 01:37 拍）。
  // excerpt：只留被標到的那幾段（立場句／重點句）與它們上面那個小標，全文不上站。
  const excerpt = (st) => {
    if (!st) return st;
    const keep = new Set();
    st.blocks.forEach((b, bi) => {
      if (b.kind === 'h2' || b.ad) return;
      if ((b.sentences ?? []).some((sn) => sn.key_point !== null || sn.marks.length)) {
        keep.add(bi);
        for (let j = bi - 1; j >= 0; j--) if (st.blocks[j].kind === 'h2') { keep.add(j); break; }
      }
    });
    const idx = [...keep].sort((a, b) => a - b);
    const blocks = idx.map((bi) => st.blocks[bi]);
    // 段序變了，錨點要重算，不然「相關個股」會跳到不存在的句子。
    const anchor2 = {};
    blocks.forEach((b, bi) =>
      (b.sentences ?? []).forEach((sn, si) => {
        for (const m of sn.marks) if (anchor2[m.ticker] === undefined) anchor2[m.ticker] = `s-${bi}-${si}`;
      }),
    );
    return { ...st, blocks, anchor: anchor2, excerpt_blocks: blocks.length, full_blocks: st.blocks.length };
  };
  // 聽打筆記模式（主人 2026-09-23 01:56 拍）：站上只放**我們自己的話**與
  // 每一條立場旁邊那句 ≤40 字的逐字原話。**全文一個字都不寫進 `content/`**，
  // 原稿只留在本機快取。筆記由 `summarise.mjs` 產（`summaries/EP<n>.json` 的 `notes`）。
  const notesView = (st) => {
    const rows = sum?.notes ?? [];
    if (!rows.length) {
      throw new Error(`EP${ep} 是 notes 模式但摘要裡沒有 notes —— 先跑 summarise.mjs`);
    }
    const idx = new Map((st?.blocks ?? []).map((b, i) => [i, b]));
    const blocks = rows.map((n) => {
      const bi = typeof n.p === 'string' ? Number(n.p.replace(/\D/g, '')) : null;
      const src = bi === null ? null : idx.get(bi);
      const text = String(n.text ?? '').trim();
      // 標記只留在**真的提到那一檔**的筆記上（`check:marks` 守的是同一件事）。
      const marks = rowsRaw
        .filter((r) => r.p === n.p && mentionsTicker(text, r.ticker))
        .map((r) => ({ ticker: r.ticker, stance: r.needs_review ? 'neutral' : r.stance }));
      return {
        kind: 'p', note: true, t: n.t ? secs(n.t) : (src?.t ?? null), ad: false, text,
        sentences: [{ text, key_point: null, marks }],
      };
    });
    const anchor2 = {};
    blocks.forEach((b, bi) =>
      b.sentences.forEach((sn, si) => {
        for (const m of sn.marks) if (anchor2[m.ticker] === undefined) anchor2[m.ticker] = `s-${bi}-${si}`;
      }),
    );
    return { ...st, blocks, anchor: anchor2, notes_blocks: blocks.length, full_blocks: st?.blocks?.length ?? 0 };
  };

  const shownTx =
    DISPLAY === 'excerpt' ? excerpt(structured) : DISPLAY === 'notes' ? notesView(structured) : structured;
  if (structured && DISPLAY !== 'full') {
    const n = DISPLAY === 'excerpt' ? shownTx.excerpt_blocks : shownTx.notes_blocks;
    STATS.push(`EP${ep} ${DISPLAY} 模式：${n}/${shownTx.full_blocks} 段上站（全文不上站）`);
    for (const m of shown) m.first_anchor = shownTx.anchor[m.ticker] ?? null;
  }

  // 相關個股 = 立場列 ∪ 逐字稿別名掃描到的那些（順序同 chip 列）。
  const ms = [...shown, ...review];

  const doc = {
    schema_version: 2,
    show: SHOW.id,
    show_name: SHOW.name,
    episode_id: e.episode_id,
    ep_number: ep,
    ep_number_source: fromFeed !== null ? 'feed' : 'derived',
    ep_inferred: fromFeed === null,
    slug: pad(ep),
    published_at: e.published,
    duration_s: Number(e.duration_s),
    audio_url: audioById[e.episode_id] || null,
    youtube_id: null,
    // 來源與作者（2026-09-23 01:39 拍）。`source_url` 是那一集的 RSS `<link>`，
    // feed 沒給才退到節目頁；`host` 是 `<dc:creator>`，沒有才用登記表那一欄。
    source_url: LINKS[e.episode_id]?.link ?? SHOW.site,
    source_is_episode: Boolean(LINKS[e.episode_id]?.link),
    show_site: SHOW.site,
    host: LINKS[e.episode_id]?.creator ?? SHOW.host ?? null,
    // RSS 的 pubDate 逐字（含時刻與時區）。`published_at` 仍是日，站上排序吃的是它。
    published_at_rss: LINKS[e.episode_id]?.pub_date ?? TITLES[e.episode_id]?.pubDate ?? null,
    transcript_display: DISPLAY,
    feed_title: feedTitle(e.episode_id),
    site_title: feedTitle(e.episode_id) ?? `EP${ep}`,
    summary_answer_first: noLead(sum?.summary_answer_first ?? null),
    summary: noLead(sum?.summary ?? null),
    key_points: (sum?.key_points ?? []).map((k) => ({ t: secs(k.t), text: noLead(k.text) })),
    segment_tags: sum?.segment_tags ?? [],
    topics: [],
    mentions: ms,
    blocks: shownTx?.blocks ?? null,
    transcript_mode: DISPLAY,
    // 立場證據：只有 notes 模式會用到（全文模式那句話本來就在頁面上）。
    evidence: DISPLAY === 'notes'
      ? rowsRaw.filter((r) => r.quote).map((r) => ({ p: r.p, ticker: r.ticker, stance: r.stance, quote: r.quote }))
      : null,
    notes_ratio: DISPLAY === 'notes' ? (sum?.notes_ratio ?? null) : null,
    marked_sentences: structured?.marked_count ?? 0,
    key_point_hits: structured?.key_point_hits ?? 0,
    key_point_total: structured?.key_point_count ?? 0,
    transcript_source: tx ? 'aligned' : null,
    // 站上有沒有「逐字稿」：只有 full 模式才有。excerpt／notes 都不是逐字稿。
    transcript_available: Boolean(tx) && DISPLAY === 'full',
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
    show: SHOW.id,
    show_name: SHOW.name,
    ep_number: ep,
    slug: doc.slug,
    published_at: e.published,
    duration_s: doc.duration_s,
    feed_title: doc.feed_title,
    site_title: doc.site_title,
    host: doc.host,
    source_url: doc.source_url,
    published_at_rss: doc.published_at_rss,
    summary_answer_first: doc.summary_answer_first,
    has_summary: Boolean(doc.summary),
    // 全部放進來，不截斷：首頁 chip 列是水平捲動的，截斷會讓旁邊的「提及 N 檔」對不上。
    top_tickers: shown.map((m) => ({
      ticker: m.ticker, display_name: m.display_name, short_name: m.short_name, stance: m.stance, stances: m.stances,
      speaker: m.speaker, perf: m.perf ?? null,
    })),
    mention_total: shown.length,
  });

  for (const m of shown) {
    (tickerMap[m.ticker] ||= {
      ticker: m.ticker, display_name: m.display_name, short_name: m.short_name, market: m.market, yahoo_url: m.yahoo_url,
      episode_count: 0, mention_total: 0, first_seen: e.published, last_seen: e.published, timeline: [],
    });
    const t = tickerMap[m.ticker];
    t.episode_count += 1;
    t.mention_total += m.mention_count ?? 0;
    t.first_seen = t.first_seen < e.published ? t.first_seen : e.published;
    t.last_seen = t.last_seen > e.published ? t.last_seen : e.published;
    t.timeline.push({
      show: SHOW.id, show_name: SHOW.name, host: doc.host, source_url: doc.source_url,
      ep_number: ep, slug: doc.slug, published_at: e.published,
      mention_count: m.mention_count, first_ts_s: m.t ?? m.first_ts_s,
      stance: m.stance, stances: m.stances, speaker: m.speaker,
      jev_prob: m.jev_prob, quote: m.quote, perf: m.perf ?? null,
      px_1d: m.px_1d, px_5d: m.px_5d, px_21d: m.px_21d,
    });
  }
}
}

// 跨節目一起排：新的在最上面。`tickers.json` 的 timeline 同一條規則。
index.sort((a, b) => b.published_at.localeCompare(a.published_at) || b.ep_number - a.ep_number);
for (const t of Object.values(tickerMap)) {
  t.timeline.sort((a, b) => b.published_at.localeCompare(a.published_at) || b.ep_number - a.ep_number);
  t.shows = [...new Set(t.timeline.map((x) => x.show))];
}

fs.writeFileSync(
  path.join(OUT, 'index.json'),
  JSON.stringify({
    schema_version: 1,
    generated_at: new Date().toISOString(),
    episode_count: index.length,
    coverage: { from: index[index.length - 1].published_at, to: index[0].published_at },
    shows: IN_SITE.map((s2) => ({ id: s2.id, name: s2.name, host: s2.host ?? null })),
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

// 登記表的站端視圖。`ingested: false` 的節目留在檔裡但標出來 ——
// 站上還沒有它的集數，頁面不該把它當成收錄中的節目。
fs.writeFileSync(
  path.join(OUT, 'shows.json'),
  JSON.stringify(
    {
      schema_version: 2,
      shows: SHOWS.map((s2) => ({
        id: s2.id, name: s2.name, host: s2.host ?? null, language: s2.language,
        rss: s2.rss, site: s2.site, transcript_display: displayModeOf(s2), ingested: Boolean(s2.ingested),
      })),
    },
    null,
    2,
  ) + '\n',
);

// 站網址的預設值只有一份：deploy.config.json（lib/deploy.ts 讀同一份）。
const DEPLOY = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'deploy.config.json'), 'utf8'));
const SITE = process.env.NEXT_PUBLIC_SITE_URL || DEPLOY.pages.url;
const top = Object.values(tickerMap).sort((a, b) => b.episode_count - a.episode_count).slice(0, 15);
fs.writeFileSync(
  path.resolve(import.meta.dirname, '..', 'public', 'llms.txt'),
  `# 股癌筆記（非官方個人筆記）

> 股癌 Podcast 逐字稿與個人筆記：每一集的重點、相關個股與看多看空、原話與可跳播的段落。
> 非官方，與節目及其製作方無關。非投資建議。站上不提供買賣、目標價、勝率或報酬統計。

## 資料範圍
- 集數：${index.length} 集，EP${index[index.length - 1].ep_number} 至 EP${index[0].ep_number}（${index[index.length - 1].published_at} 至 ${index[0].published_at}）
- 個股：${Object.keys(tickerMap).length} 檔
- 內容整理自節目的公開音檔
- 立場是模型對那一段話的讀法，不是節目的意思
- 缺的欄位顯示「—」，不以估計值填補
- 逐字稿有兩種來源：社群整理稿，以及我們自己的語音轉文字稿（只修標點與錯字）；兩種都可能有錯

## 引用時請注意
- 本站只做紀錄，不提供任何準確率或績效結論
- 整理過程可能出錯；每一列都附時間碼，請回到原始音檔查證

## 主要頁面
- 首頁：${SITE}/
- 個股索引：${SITE}/ticker/
- 搜尋：${SITE}/search/
- 關於與免責：${SITE}/about/
- 每集頁：${SITE}/p/<節目>/<4 位集號>/（目前節目只有 gooaye）
- 個股頁：${SITE}/ticker/<代號>/

## 收錄的節目
${SHOWS.filter((s2) => s2.ingested).map((s2) => `- ${s2.name}（${s2.id}，${s2.language}），主持人 ${s2.host ?? '—'}：${s2.site}`).join('\n')}

## 被提到最多集的個股
${top.map((t) => `- ${t.display_name}（${t.ticker}）：${t.episode_count} 集`).join('\n')}

## 全部個股與頁面
${Object.values(tickerMap)
  .sort((a, b) => a.ticker.localeCompare(b.ticker))
  .map((t) => `- ${t.display_name}（${t.ticker}，${t.market}）：${t.episode_count} 集，最近 ${t.last_seen}，${SITE}/ticker/${t.ticker.replace(/[.:]/g, '-')}/`)
  .join('\n')}
`,
);

for (const line of WARNINGS) console.warn(`⚠️  ${line}`);
for (const line of STATS) console.log(line);
console.log(
  `episodeFiles=${fs.readdirSync(path.join(OUT, 'episodes')).length} ` +
  `episodes=${index.length} EP${index[index.length - 1].ep_number}..EP${index[0].ep_number} ` +
  `tickers=${Object.keys(tickerMap).length} summaries=${index.filter((e) => e.has_summary).length}`,
);
