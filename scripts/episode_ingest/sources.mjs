// 節目登記表與逐字稿來源 adapter。
// 加第二個 podcast 就在 SHOWS 多一列、在 ADAPTERS 多一個來源，流程本身不用改
// （計畫 docs/plan-2026-09-23.md §B6）。這一支不呼叫模型、不寫內容檔。
import fs from 'node:fs';
import path from 'node:path';

const HOME = process.env.HOME;
export const FIN = process.env.FIN_REPO || `${HOME}/code/gh-ryvn-dev/ryvn-finance`;

/**
 * 一個節目：feed 在哪、快取在哪、集號怎麼來、逐字稿有哪幾種來源、站上放多少字。
 *
 * `transcript_display` 是**授權欄，不是排版欄**（主人 2026-09-23 01:37、01:56、01:59 拍）：
 * - `full`：整份逐字稿上站。**股癌永久留在這一格**（01:59 拍，不改）。
 * - `excerpt`：只放摘要與被標到的那幾段短引用，不放全文。
 * - `notes`：**聽打筆記** —— 每一段用我們自己的話寫 1–2 句，只有標到立場的地方
 *   才附一句 ≤40 字的逐字原話當證據。**全文不進 `content/`、不進 `out/`**，
 *   原稿只留在本機快取。整集筆記長度 ≤ 逐字稿的 ~35%（`NOTES_MAX_RATIO`）。
 *
 * **沒有寫這一欄的節目一律 `notes`** —— 預設不替別人決定要不要放全文。
 */
export const SHOWS = [
  {
    id: 'gooaye',
    name: '股癌',
    // 原作者。主人 2026-09-23 01:39：每一集都要標作者與來源連結。
    // 逐集的 `dc:creator` 由 `fetch-feed.mjs` 從 feed 補，這一欄是 feed 缺的時候的底。
    host: '謝孟恭',
    language: 'zh-TW',
    rss: 'https://feeds.soundon.fm/podcasts/954689a5-3096-43a4-a80b-7810b219cef3.xml',
    site: 'https://player.soundon.fm/p/6cdedf8b-4b8d-4e2b-99e7-d8ec2ca19d63',
    cache: process.env.GOOAYE_CACHE || `${HOME}/.ryvn-finance/podcasts/gooaye`,
    stats: path.join(FIN, 'data/podcasts/gooaye'),
    // 集號信 feed 的 itunes:episode；沒有那一欄才用日期序推（見 build-content.mjs）。
    ep_number: { from: 'itunes_episode' },
    transcript_sources: ['whatmkreallysaid', 'own-whisper'],
    transcript_display: 'full',
    ingested: true,
  },
  {
    id: 'yutinghao',
    name: '游庭皓的財經皓角',
    host: '游庭皓',
    language: 'zh-TW',
    // SoundCloud 代管，feed 只留最近 500 集（docs/second-host-candidates-2026-09-23.md）。
    rss: 'https://feeds.soundcloud.com/users/soundcloud:users:735679489/sounds.rss',
    site: 'https://www.youtube.com/@yutinghaofinance',
    youtube: '@yutinghaofinance',
    cache: process.env.YUTINGHAO_CACHE || `${HOME}/.ryvn-finance/podcasts/yutinghao`,
    stats: path.join(FIN, 'data/podcasts/yutinghao'),
    ep_number: { from: 'itunes_episode' },
    // 直播存檔每天一支，captionTracks 有 zh-TW 且不是 asr（＝上傳的字幕檔）。
    transcript_sources: ['youtube-captions', 'own-whisper'],
    transcript_display: 'notes',
    ingested: false,
  },
  {
    id: 'miula',
    name: 'M觀點',
    host: 'Miula',
    language: 'zh-TW',
    rss: 'https://feeds.soundon.fm/podcasts/b8f5a471-f4f7-4763-9678-65887beda63a.xml',
    site: 'https://www.youtube.com/@miulaviewpoint',
    youtube: '@miulaviewpoint',
    cache: process.env.MIULA_CACHE || `${HOME}/.ryvn-finance/podcasts/miula`,
    stats: path.join(FIN, 'data/podcasts/miula'),
    ep_number: { from: 'itunes_episode' },
    // 字幕軌只蓋到 EP318（2026-07-09），EP319 之後一定落到 own-whisper。
    transcript_sources: ['youtube-captions', 'own-whisper'],
    transcript_display: 'notes',
    ingested: false,
  },
];

/** 整集筆記字數 ÷ 逐字稿字數的上限（主人 2026-09-23 01:56 拍）。 */
export const NOTES_MAX_RATIO = 0.35;
/** 筆記模式下，每一條立場證據的逐字原話上限。 */
export const NOTES_QUOTE_MAX = 40;

const MODES = new Set(['full', 'excerpt', 'notes']);
/** 站上放全文／只放引用／放聽打筆記。沒寫或寫錯就是 `notes`（預設最保守）。 */
export const displayModeOf = (show) =>
  MODES.has(show?.transcript_display) ? show.transcript_display : 'notes';

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
  const links = readJson(path.join(show.cache, 'links.json')) ?? {};
  const rows = [...feed].sort((a, b) => a.published.localeCompare(b.published));
  // 集號一律先信 feed 的 `itunes:episode`。feed 沒寫那一欄的集，才由**日期序**
  // 往最近一個有集號的鄰居推 —— 舊的錨點 + 「間隔只能是 3 或 4 天」那一版，
  // 節目休一次就整條紅（docs/plan-2026-09-23.md §A2.7）。
  const nums = rows.map((r) => {
    const n = Number(titles[r.episode_id]?.itunes_episode);
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  const derive = (i) => {
    for (let j = i - 1; j >= 0; j--) if (nums[j] !== null) return nums[j] + (i - j);
    for (let j = i + 1; j < nums.length; j++) if (nums[j] !== null) return nums[j] - (j - i);
    return null;
  };
  return rows.map((r, i) => ({
    ...r,
    title: titles[r.episode_id]?.title ?? null,
    pub_date: links[r.episode_id]?.pub_date ?? titles[r.episode_id]?.pubDate ?? null,
    link: links[r.episode_id]?.link ?? null,
    creator: links[r.episode_id]?.creator ?? show.host ?? null,
    ep: nums[i] ?? derive(i),
    ep_source: nums[i] !== null ? 'feed' : derive(i) !== null ? 'derived' : 'unknown',
  }));
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
