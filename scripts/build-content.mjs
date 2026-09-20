// 由 ryvn-finance 的公開統計檔、本機 feed / 逐字稿、以及兩條上游 lane 的 site-json
// 組出站台內容 JSON。缺的欄位一律 null，頁面顯示「待補」，不填估計值。
// 用法：node scripts/build-content.mjs        （POC_EPISODES 預設 3）
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { toString as mdText } from 'mdast-util-to-string';
import { checkEpisode } from './check-structured.mjs';

const FIN = process.env.FIN_REPO || `${process.env.HOME}/code/gh-ryvn-dev/ryvn-finance`;
const CACHE = process.env.GOOAYE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/gooaye`;
const SITEJSON = path.join(CACHE, 'site-json');
const OUT = path.resolve(import.meta.dirname, '..', 'content');

// 節目登記表。之後加別的 podcast 就在這裡多一列，網址結構 /p/<show>/<集號> 不用改。
const SHOWS = [
  {
    id: 'gooaye',
    name: '股癌',
    language: 'zh-TW',
    rss: 'https://feeds.soundon.fm/podcasts/954689a5-3096-43a4-a80b-7810b219cef3.xml',
    site: 'https://player.soundon.fm/p/6cdedf8b-4b8d-4e2b-99e7-d8ec2ca19d63',
  },
];
const SHOW = SHOWS[0];
// 站上只放「摘要 lane 審過」的集數：summaries/index.json 就是那張清單。
const SUM_INDEX = (() => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.env.GOOAYE_CACHE || `${process.env.HOME}/.ryvn-finance/podcasts/gooaye`, 'site-json', 'summaries', 'index.json'), 'utf8'));
    return new Set((j.episodes ?? []).map((e) => Number(String(e.ep).replace(/\D/g, ''))));
  } catch {
    return null;
  }
})();
const LIMIT = Number(process.env.POC_EPISODES || 0) || null;

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

const episodes = csv(path.join(FIN, 'data/podcasts/gooaye/episodes.csv'));
const mentions = csv(path.join(FIN, 'data/podcasts/gooaye/mentions.csv'));
const feed = JSON.parse(fs.readFileSync(path.join(CACHE, 'feed.json'), 'utf8'));
const audioById = Object.fromEntries(feed.map((f) => [f.episode_id, f.audio_url]));
const NAMES = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'ticker-names.json'), 'utf8'));

// 節目官方 feed 的原標題（本機快取，不進 repo）：{ episode_id: { title, pubDate, itunes_episode } }
const TITLES = readIf(path.join(CACHE, 'titles.json')) ?? {};
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

const STATS = [];
const nameOf = (t) => NAMES[t]?.name || t;
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
  const tree = unified().use(remarkParse).use(remarkDirective).parse(fs.readFileSync(f, 'utf8'));
  const out = [];
  const T_RE = /^\s*\[t=(\d+)\]\s*/;
  const push = (kind, raw, ad) => {
    const m = raw.match(T_RE);
    const text = raw.replace(T_RE, '').trim();
    if (!text) return;
    out.push({ kind, t: m ? Number(m[1]) : null, ad, text });
  };
  const walk = (nodes, ad) => {
    for (const n of nodes) {
      if (n.type === 'heading' && n.depth === 2) out.push({ kind: 'h2', text: mdText(n) });
      else if (n.type === 'containerDirective') walk(n.children, n.name === 'ad');
      else if (n.type === 'blockquote') push('quote', n.children.map(mdText).join(''), ad);
      else if (n.type === 'paragraph') push('p', mdText(n), ad);
    }
  };
  walk(tree.children, false);
  return out.length ? out : null;
};

// ── 句子層 ─────────────────────────────────────────────────────────────────
// 提到個股的句子給虛線底線、重點句給黃底，兩種都只在 hover 才出現 tooltip。

const ALIASES = (() => {
  const f = path.join(FIN, 'data', 'podcasts', 'aliases.csv');
  const map = {};
  if (!fs.existsSync(f)) return map;
  for (const r of csv(f)) {
    if (!r.ticker || !r.alias) continue;
    (map[r.ticker] ||= []).push(r.alias);
  }
  return map;
})();

const SENT_END = /(?<=[。！？!?])/;
const splitSentences = (t) => t.split(SENT_END).map((x) => x.trim()).filter(Boolean);

const buildTranscript = (blocks, sum, mentions) => {
  if (!blocks?.length) return null;
  const names = mentions.map((m) => ({
    ticker: m.ticker,
    words: [m.ticker, m.ticker.replace('TW:', ''), m.display_name, ...(ALIASES[m.ticker] ?? [])].filter(
      (w) => w && String(w).length >= 2,
    ),
  }));

  // 先把每一段切成句子，句子在集內的座標是 `${blockIndex}:${sentenceIndex}`。
  const sents = [];
  const body = blocks.map((b, bi) => {
    if (b.kind === 'h2' || b.ad) return { ...b, sentences: [] };
    const list = splitSentences(b.text);
    list.forEach((text, si) => sents.push({ bi, si, t: si === 0 ? b.t ?? null : null, text, chars: text.length }));
    return { ...b, sentences: list.map((text) => ({ text, key_point: null, tickers: [] })) };
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

  // 重點 → 句子。原訂用 SequenceMatcher ≥0.35，實測 EP693 最高只有 0.26（重點是改寫過的短句，
  // 逐字稿是口語長句），照那個門檻會一句都反白不到。改用「重點的字元 bigram 有多少比例出現在這一句」
  // （recall，長句不會因為長而被罰），再加分離度：要贏過同一個時間窗裡的第二名 1.4 倍；
  // 兩句幾乎同分又相鄰時兩句都反白（一個重點常常橫跨兩句）。門檻與命中數每次 build 都會印出來。
  const MIN_R = 0.25;
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
  const kps = (sum?.key_points ?? []).map((k, i) => ({ i, t: secs(k.t), text: noLead(k.text) }));
  const sentBi = new Map(sents.map((s) => [s, bigrams(s.text)]));
  let kpHits = 0;
  for (const kp of kps) {
    if (kp.t === null) continue;
    const kb = bigrams(kp.text);
    const cands = sents
      .filter((s) => s.t_est !== null && Math.abs(s.t_est - kp.t) <= 60 && s.text.length >= 8)
      .map((s) => ({ s, r: recall(kb, sentBi.get(s)) }))
      .sort((a, b) => b.r - a.r);
    const best = cands[0];
    const second = cands[1];
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

  // 個股 → 句子：句子裡出現代碼或別名就給虛線底線；摘要 lane 的逐字 quote 優先當錨點。
  const anchor = {};
  for (const s of sents) {
    const hits = names.filter((n) => n.words.some((w) => s.text.includes(w))).map((n) => n.ticker);
    if (!hits.length) continue;
    body[s.bi].sentences[s.si].tickers = hits;
    for (const tk of hits) if (anchor[tk] === undefined) anchor[tk] = `s-${s.bi}-${s.si}`;
  }
  for (const m of mentions) {
    const q = (m.quote ?? '').trim();
    if (q.length < 6) continue;
    const found = sents.find((s) => s.text.includes(q) || q.includes(s.text));
    if (!found) continue;
    const cell = body[found.bi].sentences[found.si];
    if (!cell.tickers.includes(m.ticker)) cell.tickers = [...cell.tickers, m.ticker];
    anchor[m.ticker] = `s-${found.bi}-${found.si}`;
  }

  const marked = body.reduce(
    (a, b) => a + b.sentences.filter((s) => s.key_point !== null || s.tickers.length).length,
    0,
  );
  return {
    blocks: body,
    anchor,
    heading_count: body.filter((b) => b.kind === 'h2').length,
    quote_count: body.filter((b) => b.kind === 'quote').length,
    ad_count: body.filter((b) => b.ad).length,
    marked_count: marked,
    key_point_hits: kpHits,
    key_point_count: kps.length,
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

const byEp = {};
for (const m of mentions) (byEp[m.episode_id] ||= []).push(m);

const index = [];
const tickerMap = {};

for (let i = 0; i < episodes.length; i++) {
  const e = episodes[i];
  const derivedEp = ANCHOR.ep - (anchorIdx - i);
  const fromFeed = feedEpNo(e.episode_id);
  if (fromFeed !== null && fromFeed !== derivedEp) {
    throw new Error(`集號對不上：feed 說 EP${fromFeed}，錨點推定 EP${derivedEp}（${e.published}）`);
  }
  const ep = fromFeed ?? derivedEp;
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
  // 摘要 lane 那一份是審過的主列，直接採用；0.70 閘只用在「摘要沒列、機器補上來」的那些。
  const primaryTickers = (sum?.tickers ?? []).map((s) => s.ticker);
  const shown = (sum?.tickers ?? []).map((s) => build(s.ticker, s, false));
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
  for (const m of shown) m.perf = perfOf(m.ticker, e.published);
  const ms = [...shown, ...review];
  const tx = loadStructured(ep);
  const structured = buildTranscript(tx, sum, shown);
  if (structured) {
    for (const m of shown) m.first_anchor = structured.anchor[m.ticker] ?? null;
    STATS.push(
      `EP${ep} h2=${structured.heading_count} 引用=${structured.quote_count} 代言段=${structured.ad_count} ` +
        `段=${structured.blocks.filter((b) => b.kind === 'p' && !b.ad).length} ` +
        `平均${Math.round(
          structured.blocks.filter((b) => b.kind === 'p' && !b.ad).reduce((a, b) => a + b.text.length, 0) /
            Math.max(1, structured.blocks.filter((b) => b.kind === 'p' && !b.ad).length),
        )}字 標記句=${structured.marked_count} 重點命中=${structured.key_point_hits}/${structured.key_point_count}`,
    );
  }

  const doc = {
    schema_version: 2,
    show: SHOW.id,
    show_name: SHOW.name,
    episode_id: e.episode_id,
    ep_number: ep,
    ep_number_source: fromFeed !== null ? 'feed' : VERIFIED_EPS.includes(ep) ? 'verified' : 'derived',
    ep_inferred: fromFeed === null && !VERIFIED_EPS.includes(ep),
    slug: pad(ep),
    published_at: e.published,
    duration_s: Number(e.duration_s),
    audio_url: audioById[e.episode_id] || null,
    youtube_id: null,
    source_url: 'https://player.soundon.fm/p/6cdedf8b-4b8d-4e2b-99e7-d8ec2ca19d63',
    feed_title: feedTitle(e.episode_id),
    site_title: feedTitle(e.episode_id) ?? `EP${ep}`,
    summary_answer_first: noLead(sum?.summary_answer_first ?? null),
    summary: noLead(sum?.summary ?? null),
    key_points: (sum?.key_points ?? []).map((k) => ({ t: secs(k.t), text: noLead(k.text) })),
    segment_tags: sum?.segment_tags ?? [],
    topics: [],
    mentions: ms,
    blocks: structured?.blocks ?? null,
    marked_sentences: structured?.marked_count ?? 0,
    key_point_hits: structured?.key_point_hits ?? 0,
    key_point_total: structured?.key_point_count ?? 0,
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
    show: SHOW.id,
    show_name: SHOW.name,
    ep_number: ep,
    slug: doc.slug,
    published_at: e.published,
    duration_s: doc.duration_s,
    feed_title: doc.feed_title,
    site_title: doc.site_title,
    summary_answer_first: doc.summary_answer_first,
    has_summary: Boolean(doc.summary),
    top_tickers: shown.slice(0, 8).map((m) => ({
      ticker: m.ticker, display_name: m.display_name, stance: m.stance, stances: m.stances,
      speaker: m.speaker, perf: m.perf ?? null,
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
      show: SHOW.id, show_name: SHOW.name,
      ep_number: ep, slug: doc.slug, published_at: e.published,
      mention_count: m.mention_count, first_ts_s: m.t ?? m.first_ts_s,
      stance: m.stance, stances: m.stances, speaker: m.speaker,
      jev_prob: m.jev_prob, quote: m.quote, perf: m.perf ?? null,
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

fs.writeFileSync(path.join(OUT, 'shows.json'), JSON.stringify({ schema_version: 1, shows: SHOWS }, null, 2) + '\n');

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ryvn-dev.github.io/gooaye-notes';
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
- 逐字稿為社群整理，可能有錯

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
${SHOWS.map((s2) => `- ${s2.name}（${s2.id}，${s2.language}）：${s2.site}`).join('\n')}

## 被提到最多集的個股
${top.map((t) => `- ${t.display_name}（${t.ticker}）：${t.episode_count} 集`).join('\n')}

## 全部個股與頁面
${Object.values(tickerMap)
  .sort((a, b) => a.ticker.localeCompare(b.ticker))
  .map((t) => `- ${t.display_name}（${t.ticker}，${t.market}）：${t.episode_count} 集，最近 ${t.last_seen}，${SITE}/ticker/${t.ticker.replace(/[.:]/g, '-')}/`)
  .join('\n')}
`,
);

for (const line of STATS) console.log(line);
console.log(
  `episodeFiles=${fs.readdirSync(path.join(OUT, 'episodes')).length} ` +
  `episodes=${index.length} EP${index[index.length - 1].ep_number}..EP${index[0].ep_number} ` +
  `tickers=${Object.keys(tickerMap).length} summaries=${index.filter((e) => e.has_summary).length}`,
);
