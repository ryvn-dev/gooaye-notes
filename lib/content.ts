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

export type Show = { id: string; name: string; language: string; rss: string; site: string };

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
  source_url: string;
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
  timeline: {
    show: string;
    show_name: string;
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
