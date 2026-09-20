import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'content');
const read = <T,>(p: string): T => JSON.parse(fs.readFileSync(path.join(DIR, p), 'utf8')) as T;

export type Stance = 'bullish' | 'bearish' | 'neutral' | 'mentioned';

export type Mention = {
  ticker: string;
  display_name: string;
  market: 'US' | 'TW';
  mention_count: number;
  first_ts_s: number;
  stance: Stance;
  stance_p: number | null;
  stance_margin: number | null;
  is_about_p: number | null;
  source: string;
  needs_review: boolean;
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
};

export type Episode = {
  schema_version: number;
  episode_id: string;
  ep_number: number;
  ep_number_source: string;
  slug: string;
  published_at: string;
  duration_s: number;
  audio_url: string | null;
  youtube_id: string | null;
  source_url: string;
  site_title: string;
  summary_answer_first: string | null;
  summary: string | null;
  key_points: { t: number | null; text: string }[];
  segment_tags: string[];
  topics: string[];
  mentions: Mention[];
  ep_inferred?: boolean;
  transcript: { t: number; text: string }[] | null;
  transcript_available: boolean;
  provenance: Record<string, string | null>;
};

export type IndexEntry = {
  ep_number: number;
  slug: string;
  published_at: string;
  duration_s: number;
  site_title: string;
  summary_answer_first: string | null;
  has_summary: boolean;
  top_tickers: { ticker: string; display_name: string; stance: Stance; stances: Stance[]; speaker: string | null }[];
  mention_total: number;
};

export type TickerRow = {
  ticker: string;
  display_name: string;
  market: 'US' | 'TW';
  yahoo_url: string;
  episode_count: number;
  mention_total: number;
  first_seen: string;
  last_seen: string;
  timeline: {
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
    px_1d: number | null;
    px_5d: number | null;
    px_21d: number | null;
  }[];
};

export const getIndex = () =>
  read<{ episode_count: number; coverage: { from: string; to: string }; episodes: IndexEntry[] }>('index.json');

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

export const speakerLabel = (s: string | null) => s ?? '主持人';

export const STANCE_ORDER: Stance[] = ['bullish', 'bearish', 'neutral', 'mentioned'];

export const pct = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);

export const STANCE: Record<Stance, { label: string; cls: string }> = {
  bullish: { label: '看多', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  bearish: { label: '看空', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  neutral: { label: '保留', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' },
  mentioned: { label: '提到但無立場', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};
