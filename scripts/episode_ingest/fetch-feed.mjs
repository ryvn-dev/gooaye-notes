// 從節目的 RSS 補兩欄**只有 feed 才答得出來**的東西：每一集的原始連結與作者。
//
// 為什麼要單獨一支：`~/.ryvn-finance/podcasts/<show>/feed.json` 只留了
// episode_id／日期／時長／音檔，沒有 `<link>` 也沒有 `<dc:creator>`。
// 主人 2026-09-23 01:39 拍板「每一集要標原作者與來源連結」，那兩欄就得從 feed 補。
//
// 出：`<cache>/links.json` = { <episode_id>: { link, creator, pub_date, guid, ep } }
// **只在本機**（跟 feed.json 同一個資料夾，不進 repo）。站端 `build-content.mjs` 讀它，
// 讀不到就退回節目頁（`SHOWS[].site`），不編一個網址出來。
//
// 用法：
//   node scripts/episode_ingest/fetch-feed.mjs                 # 預設 gooaye
//   node scripts/episode_ingest/fetch-feed.mjs --show gooaye --dry-run
import fs from 'node:fs';
import path from 'node:path';
import { SHOWS, showById } from './sources.mjs';

const argv = process.argv.slice(2);
const flag = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const show = showById(flag('show', SHOWS[0].id));
if (!show) {
  console.error(`沒有這個節目：${flag('show')}；有的是 ${SHOWS.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

const un = (s) =>
  String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
// 標籤名後面要嘛直接收尾、要嘛接空白 —— 不這樣寫 `itunes:episode` 會先咬到
// `itunes:episodeType`，回來的是 `Full…` 而不是集號（2026-09-23 踩過）。
const tag = (item, name) => {
  const m = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? un(m[1]) : null;
};
/** 先把長文欄位拿掉，剩下的才是每一集的欄位 —— 描述裡也會有 `<a>`、`<link>` 這種字。 */
const meta = (item) =>
  item
    .replace(/<description>[\s\S]*?<\/description>/g, '')
    .replace(/<content:encoded>[\s\S]*?<\/content:encoded>/g, '')
    .replace(/<itunes:summary>[\s\S]*?<\/itunes:summary>/g, '');

const xml = await fetch(show.rss, { headers: { 'user-agent': 'gooaye-notes/1.0 (personal notes)' } }).then(
  (r) => {
    if (!r.ok) throw new Error(`RSS ${r.status} ${show.rss}`);
    return r.text();
  },
);

const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
if (!items.length) {
  console.error(`feed 解不出 <item>：${show.rss}`);
  process.exit(1);
}

// titles.json 是 episode_id → { title, pubDate, itunes_episode }；用集號把兩邊接起來。
const titlesFile = path.join(show.cache, 'titles.json');
const titles = fs.existsSync(titlesFile) ? JSON.parse(fs.readFileSync(titlesFile, 'utf8')) : {};
const idByEp = {};
for (const [id, t] of Object.entries(titles)) {
  const n = Number(t?.itunes_episode);
  if (Number.isFinite(n) && n > 0) idByEp[n] = id;
}

const out = {};
let noEp = 0;
for (const raw of items) {
  const item = meta(raw);
  const ep = Number(tag(item, 'itunes:episode'));
  if (!Number.isFinite(ep) || ep <= 0) { noEp++; continue; }
  const id = idByEp[ep];
  if (!id) continue; // 這一集不在我們的快取裡，不憑空造一列
  out[id] = {
    ep,
    link: tag(item, 'link'),
    creator: tag(item, 'dc:creator') ?? tag(item, 'itunes:author') ?? null,
    pub_date: tag(item, 'pubDate'),
    guid: tag(item, 'guid'),
  };
}

const withLink = Object.values(out).filter((r) => r.link).length;
const withCreator = Object.values(out).filter((r) => r.creator).length;
console.log(
  `${show.id}：feed ${items.length} 集（沒有 itunes:episode ${noEp}）· 對上快取 ${Object.keys(out).length} 集 ` +
    `· 有連結 ${withLink} · 有作者 ${withCreator}`,
);

if (has('dry-run')) {
  const first = Object.entries(out)[0];
  if (first) console.log('範例：', first[0], JSON.stringify(first[1], null, 1));
  console.log('（dry-run，沒有寫檔）');
  process.exit(0);
}

fs.mkdirSync(show.cache, { recursive: true });
fs.writeFileSync(path.join(show.cache, 'links.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`寫入 ${path.join(show.cache, 'links.json')}`);
