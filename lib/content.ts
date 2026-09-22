import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'content');
const read = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(DIR, p), 'utf8')) as T;

// mixed＝同一集裡他對同一檔講過看多也講過看空，chip 畫雙向箭頭，不用多數決蓋掉。
export type Stance = 'bullish' | 'bearish' | 'neutral' | 'mentioned' | 'mixed';

export type Perf = {
  base_date: string;
  base: number;
  last_date: string;
  last: number;
  pct: number | null;
  d5: number | null;
  d21: number | null;
};

/** 句子上的螢光標記：哪一檔、那一段他的讀法是什麼（待覆核的一律灰點）。 */
export type SentenceMark = { ticker: string; stance: Stance };
export type Sentence = { text: string; key_point: number | null; marks: SentenceMark[] };

/** 結構化逐字稿的一個區塊：小標、主文段、引用段（代言段 ad=true 走淡灰樣式，不貼任何標籤字）。 */
export type Block = {
  kind: 'h2' | 'p' | 'quote';
  text: string;
  t?: number | null;
  ad?: boolean;
  sentences: Sentence[];
};

export type Mention = {
  ticker: string;
  display_name: string;
  short_name?: string | null;
  market: 'US' | 'TW';
  mention_count: number;
  first_ts_s: number;
  stance: Stance;
  stance_p: number | null;
  stance_margin: number | null;
  is_about_p: number | null;
  source: string;
  needs_review: boolean;
  publish?: boolean;
  row_count?: number;
  stances: Stance[];
  jev_prob: number | null;
  jev_question: string | null;
  speaker: string | null;
  quote: string | null;
  t: number | null;
  yahoo_url: string;
  px_1d: number | null;
  px_5d: number | null;
  px_21d: number | null;
  perf: Perf | null;
  first_anchor?: string | null;
};

/** 站上放多少逐字稿。授權欄，不是排版欄。 */
export type TranscriptDisplay = 'full' | 'excerpt' | 'notes';

export type Show = {
  id: string;
  name: string;
  /** 原作者／主持人。每一集標的是 feed 的 dc:creator，這一欄是 feed 缺時的底。 */
  host: string | null;
  language: string;
  rss: string;
  site: string;
  /**
   * full＝全文上站（股癌，2026-09-23 01:59 拍，永久）；
   * excerpt＝只放摘要與被標到的那幾段短引用；
   * notes＝聽打筆記，逐字稿一個字都不進 `content/` 與 `out/`。
   * 沒寫的節目一律當 notes（`scripts/episode_ingest/sources.mjs` 的 `displayModeOf`）。
   */
  transcript_display: TranscriptDisplay;
  /** 站上已經有這個節目的集數了沒。 */
  ingested: boolean;
};

export type Bar = { d: string; o: number; h: number; l: number; c: number; v: number };

export type Episode = {
  schema_version: number;
  show: string;
  show_name: string;
  episode_id: string;
  ep_number: number;
  ep_number_source: string;
  slug: string;
  published_at: string;
  duration_s: number;
  audio_url: string | null;
  youtube_id: string | null;
  /** 這一集在節目端的原始連結（RSS `<link>`）；feed 沒給才退回節目頁。 */
  source_url: string;
  source_is_episode: boolean;
  show_site: string;
  /** 原作者（RSS `<dc:creator>`）。 */
  host: string | null;
  /** RSS `pubDate` 逐字（含時刻與時區）；排序仍用 `published_at`。 */
  published_at_rss: string | null;
  transcript_display: TranscriptDisplay;
  feed_title: string | null;
  site_title: string;
  summary_answer_first: string | null;
  summary: string | null;
  key_points: { t: number | null; text: string }[];
  segment_tags: string[];
  topics: string[];
  mentions: Mention[];
  ep_inferred?: boolean;
  blocks: Block[] | null;
  transcript_mode: TranscriptDisplay;
  /** notes 模式的立場證據（≤40 字逐字原話）。full／excerpt 是 null —— 那句話本來就在頁面上。 */
  evidence: { p: string | null; ticker: string; stance: Stance; quote: string }[] | null;
  /** notes 模式：筆記字數 ÷ 逐字稿字數（上限 0.35）。其它模式是 null。 */
  notes_ratio: number | null;
  marked_sentences: number;
  key_point_hits: number;
  key_point_total: number;
  transcript_source: string | null;
  transcript_available: boolean;
  provenance: Record<string, string | null>;
};

export type IndexEntry = {
  show: string;
  show_name: string;
  ep_number: number;
  slug: string;
  published_at: string;
  duration_s: number;
  feed_title: string | null;
  site_title: string;
  host: string | null;
  source_url: string;
  published_at_rss: string | null;
  summary_answer_first: string | null;
  has_summary: boolean;
  top_tickers: {
    ticker: string;
    short_name?: string | null;
    display_name: string;
    stance: Stance;
    stances: Stance[];
    speaker: string | null;
    perf?: Perf | null;
  }[];
  mention_total: number;
};

export type TickerRow = {
  ticker: string;
  display_name: string;
  short_name?: string | null;
  market: 'US' | 'TW';
  yahoo_url: string;
  episode_count: number;
  mention_total: number;
  first_seen: string;
  last_seen: string;
  /** 這一檔被哪幾個節目講過（`show.id`，依站上的節目順序）。 */
  shows: string[];
  timeline: {
    show: string;
    show_name: string;
    /** 那一集的原作者與原始連結 —— 個股頁的每一列都要指得回去。 */
    host: string | null;
    source_url: string;
    ep_number: number;
    slug: string;
    published_at: string;
    mention_count: number;
    first_ts_s: number;
    stance: Stance;
    stances: Stance[];
    speaker: string | null;
    jev_prob: number | null;
    quote: string | null;
    perf?: Perf | null;
    px_1d: number | null;
    px_5d: number | null;
    px_21d: number | null;
  }[];
};

export const getIndex = () =>
  read<{ episode_count: number; coverage: { from: string; to: string }; episodes: IndexEntry[] }>('index.json');

export const getShows = () => read<{ shows: Show[] }>('shows.json');

export const getPrices = (ticker: string): { rows: Bar[]; source: string } | null => {
  const f = path.join(DIR, 'prices', `${tickerSlug(ticker)}.json`);
  if (!fs.existsSync(f)) return null;
  const j = JSON.parse(fs.readFileSync(f, 'utf8')) as { rows: Bar[]; source: string };
  const cut = new Date(Date.now() - 366 * 86400000).toISOString().slice(0, 10);
  return { source: j.source, rows: j.rows.filter((r) => r.d >= cut) };
};

export const getTickers = () => read<{ ticker_count: number; tickers: TickerRow[] }>('tickers.json');

export const getEpisode = (slug: string) => read<Episode>(path.join('episodes', `EP${slug}.json`));

let _all: Episode[] | null = null;
/** 所有集數 JSON（build 時讀一次就好，Next 每個 worker 各自快取）。 */
export const getAllEpisodes = (): Episode[] => {
  if (_all) return _all;
  const d = path.join(DIR, 'episodes');
  _all = fs
    .readdirSync(d)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) as Episode);
  return _all;
};

/**
 * 逐字稿本身算出來的事實。`mentions.csv` 的 `mention_count` 對別名掃描進來的檔一律是 0
 * （所以列表上出現過「1 集 · 0 次」），站上顯示的數字一律改用**逐字稿裡真的被標到的句子數**，
 * 與螢光筆同一個口徑：頁面上數得出幾句，這裡就是幾句。
 */
export type TranscriptFacts = {
  /** ticker -> 全站標到的句子數 */
  sentences: Record<string, number>;
  /** `${slug}|${ticker}` -> 那一集標到的句子數 */
  perEpisode: Record<string, number>;
  /** `${slug}|${ticker}` -> 那一集第一句的錨點 id（跳回逐字稿用） */
  anchor: Record<string, string>;
};

let _facts: TranscriptFacts | null = null;
export const getTranscriptFacts = (): TranscriptFacts => {
  if (_facts) return _facts;
  const f: TranscriptFacts = { sentences: {}, perEpisode: {}, anchor: {} };
  for (const e of getAllEpisodes()) {
    (e.blocks ?? []).forEach((b, bi) =>
      (b.sentences ?? []).forEach((s, si) =>
        s.marks.forEach((mk) => {
          const key = `${e.slug}|${mk.ticker}`;
          f.sentences[mk.ticker] = (f.sentences[mk.ticker] ?? 0) + 1;
          f.perEpisode[key] = (f.perEpisode[key] ?? 0) + 1;
          if (!f.anchor[key]) f.anchor[key] = `s-${bi}-${si}`;
        }),
      ),
    );
  }
  _facts = f;
  return f;
};

export const tickerSlug = (t: string) => t.replace(/[.:]/g, '-');
export const findTicker = (slug: string) =>
  getTickers().tickers.find((t) => tickerSlug(t.ticker) === slug);

export const mmss = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

export const minutes = (s: number) => Math.round(s / 60);

export const stancesOf = (m: { stance: Stance; stances?: Stance[] }): Stance[] =>
  m.stances && m.stances.length > 0 ? m.stances : [m.stance];

/** chip 上那一個 icon：mixed 不能被 stances[0] 蓋成單一方向。 */
export const chipStance = (m: { stance?: Stance | null; stances?: Stance[] }): Stance =>
  m.stance ?? (m.stances && m.stances[0]) ?? 'mentioned';

export const speakerLabel = (s: string | null) => s ?? '主持人';

export const STANCE_ORDER: Stance[] = ['bullish', 'bearish', 'mixed', 'neutral', 'mentioned'];

export const pct = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);

export const STANCE: Record<Stance, { label: string; cls: string }> = {
  bullish: { label: '看多', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  bearish: { label: '看空', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  neutral: { label: '保留', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' },
  mentioned: { label: '提到但無立場', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  mixed: { label: '看多也看空', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};
