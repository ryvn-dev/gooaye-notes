// 節目登記表與逐字稿來源 adapter。
// 加第二個 podcast 就在 SHOWS 多一列、在 ADAPTERS 多一個來源，流程本身不用改
// （計畫 docs/plan-2026-09-23.md §B6）。這一支不呼叫模型、不寫內容檔。
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME;
export const FIN = process.env.FIN_REPO || `${HOME}/code/gh-ryvn-dev/ryvn-finance`;

/** 一個節目：feed 在哪、快取在哪、集號怎麼來、逐字稿有哪幾種來源。 */
export const SHOWS = [
  {
    id: 'gooaye',
    name: '股癌',
    language: 'zh-TW',
    rss: 'https://feeds.soundon.fm/podcasts/954689a5-3096-43a4-a80b-7810b219cef3.xml',
    site: 'https://player.soundon.fm/p/6cdedf8b-4b8d-4e2b-99e7-d8ec2ca19d63',
    cache: process.env.GOOAYE_CACHE || `${HOME}/.ryvn-finance/podcasts/gooaye`,
    stats: path.join(FIN, 'data/podcasts/gooaye'),
    // 集號先信 feed 的 itunes:episode；沒有才退回日期錨點（見 build-content.mjs）。
    ep_number: { from: 'itunes_episode', anchor: { date: '2026-09-19', ep: 698 } },
    transcript_sources: ['whatmkreallysaid', 'own-whisper'],
  },
];

export const showById = (id) => SHOWS.find((s) => s.id === id) ?? null;

const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

const readCsv = (f) => {
  if (!fs.existsSync(f)) return [];
  const [h, ...rows] = fs.readFileSync(f, 'utf8').trim().split('\n');
  const cols = h.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};

/**
 * 節目的集數清單（本機快取；要更新先跑 ryvn-finance 的 `npm run podcast:fetch`）。
 * 回 [{ episode_id, published, duration_s, audio_url, title, ep }]，依日期遞增。
 */
export const listEpisodes = (show) => {
  const feed = readJson(path.join(show.cache, 'feed.json')) ?? [];
  const titles = readJson(path.join(show.cache, 'titles.json')) ?? {};
  const rows = [...feed].sort((a, b) => a.published.localeCompare(b.published));
  const anchor = show.ep_number.anchor;
  const anchorIdx = anchor ? rows.findIndex((r) => r.published === anchor.date) : -1;
  return rows.map((r, i) => {
    const t = titles[r.episode_id] ?? {};
    const fromFeed = Number(t.itunes_episode);
    const ep = Number.isFinite(fromFeed) && fromFeed > 0
      ? fromFeed
      : anchorIdx >= 0 ? anchor.ep - (anchorIdx - i) : null;
    return {
      ...r,
      title: t.title ?? null,
      ep,
      ep_source: Number.isFinite(fromFeed) && fromFeed > 0 ? 'feed' : anchorIdx >= 0 ? 'derived' : 'unknown',
    };
  });
};

/**
 * 逐字稿來源 adapter：每一個來源回答同一個問題 ——
 * 「這一集的文字在不在你那裡、多長、要不要另外對時間碼」。
 * has(ep) → null 代表這個來源沒有這一集。
 */
export const ADAPTERS = {
  /** 社群整理稿：文字乾淨，沒有時間碼，要跟我們的 whisper 稿對齊。 */
  whatmkreallysaid: {
    id: 'whatmkreallysaid',
    kind: 'community',
    needs_alignment: true,
    publishable: true, // 主人 2026-09-21 05:59：站上放社群稿
    has(show, epi) {
      if (epi.ep === null) return null;
      const f = path.join(show.cache, 'community', 'whatmkreallysaid', `EP${epi.ep}.md`);
      if (!fs.existsSync(f)) return null;
      const row = readCsv(path.join(show.cache, 'community', 'manifest.csv'))
        .find((r) => r.ep === `EP${epi.ep}`);
      return { path: f, chars: Number(row?.chars ?? fs.statSync(f).size), has_timestamps: row?.has_timestamps === 'true' };
    },
  },
  /** 自家 whisper：有時間碼，文字錯字多；沒有社群稿的集才清理後上站（09-21 09:32 例外）。 */
  'own-whisper': {
    id: 'own-whisper',
    kind: 'own',
    needs_alignment: false,
    publishable: 'cleaned-only',
    has(show, epi) {
      const f = path.join(show.cache, 'transcripts', `${epi.episode_id}.json`);
      if (!fs.existsSync(f)) return null;
      return { path: f, chars: null, has_timestamps: true };
    },
  },
};

/** 這一集該走哪一條逐字稿路徑：社群稿優先，沒有才自家 whisper。 */
export const pickSource = (show, epi) => {
  for (const id of show.transcript_sources) {
    const hit = ADAPTERS[id]?.has(show, epi);
    if (hit) return { adapter: ADAPTERS[id], ...hit };
  }
  return null;
};

/** 後面幾關的產物在不在（都在 repo 外的快取裡）。 */
export const stations = (show, epi) => {
  const sj = path.join(show.cache, 'site-json');
  const ep = epi.ep;
  const audioDir = path.join(show.cache, 'audio');
  const audio = fs.existsSync(audioDir)
    ? fs.readdirSync(audioDir).find((f) => f.startsWith(`${show.id}-${epi.published}-`) && f.endsWith('.mp3')) ?? null
    : null;
  const summaryFile = ep === null ? null : path.join(sj, 'summaries', `EP${ep}.json`);
  const summary = summaryFile && fs.existsSync(summaryFile) ? readJson(summaryFile) : null;
  return {
    audio,
    aligned: ep !== null && fs.existsSync(path.join(sj, 'transcripts', `EP${ep}.json`)),
    structured: ep !== null && fs.existsSync(path.join(sj, 'transcripts', `EP${ep}.structured.md`)),
    summary: Boolean(summary),
    // v2.1 的摘要每一列帶段落錨點 p-<n> 與 basis；舊 schema 沒有，等於要重做。
    summary_v2: Boolean(summary && (summary.tickers ?? []).some((t) => 'p' in t)),
    on_site: fs.existsSync(
      path.resolve(import.meta.dirname, '..', '..', 'content', 'episodes', `EP${String(ep).padStart(4, '0')}.json`),
    ),
  };
};
