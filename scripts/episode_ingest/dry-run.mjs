// Dry run：一集一列，印出它卡在哪一關。**不呼叫模型、不寫任何檔。**
// 用法：
//   node scripts/episode_ingest/dry-run.mjs                 # 最近 15 集
//   node scripts/episode_ingest/dry-run.mjs --from 681 --to 690
//   node scripts/episode_ingest/dry-run.mjs --show gooaye --all
//   node scripts/episode_ingest/dry-run.mjs --json
// 管道七步見 ryvn-finance docs/podcast-pipeline.md；回補計畫見 docs/plan-2026-09-23.md。
import { SHOWS, showById, listEpisodes, pickSource, stations } from './sources.mjs';

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

const from = flag('from') === null ? null : Number(flag('from'));
const to = flag('to') === null ? null : Number(flag('to'));

let eps = listEpisodes(show);
if (!eps.length) {
  console.error(`feed 快取是空的：${show.cache}/feed.json —— 先在 ryvn-finance 跑 npm run podcast:fetch`);
  process.exit(1);
}
if (from !== null || to !== null) {
  eps = eps.filter((e) => e.ep !== null && (from === null || e.ep >= from) && (to === null || e.ep <= to));
} else if (!has('all')) {
  eps = eps.slice(-15);
}

const rows = eps.map((e) => {
  const src = pickSource(show, e);
  const st = stations(show, e);
  // 卡在哪一關：由前往後第一個不成立的站。
  const blocked = !st.audio
    ? '音檔'
    : !src
      ? '逐字稿'
      : src.adapter.needs_alignment && !st.aligned
        ? '對齊'
        : !st.structured
          ? '排版(Opus)'
          : !st.summary
            ? '摘要(Opus)'
            : !st.summary_v2
              ? '摘要是舊 schema'
              : !st.on_site
                ? '站端 npm run content'
                : null;
  return {
    ep: e.ep,
    published: e.published,
    title: e.title,
    ep_source: e.ep_source,
    duration_s: e.duration_s,
    source: src?.adapter.id ?? null,
    source_kind: src?.adapter.kind ?? null,
    chars: src?.chars ?? null,
    ...st,
    blocked,
  };
});

if (has('json')) {
  console.log(JSON.stringify({ show: show.id, generated_at: new Date().toISOString(), episodes: rows }, null, 2));
  process.exit(0);
}

const y = (b) => (b ? '有' : '—');
console.log(`節目 ${show.name}（${show.id}）· feed 快取 ${show.cache}/feed.json · ${rows.length} 集`);
console.log('集號   日期        來源           音檔 對齊 排版 摘要 v2 站上  卡在');
for (const r of rows) {
  console.log(
    [
      `EP${String(r.ep ?? '?').padStart(4)}`,
      r.published,
      (r.source ?? '（沒有稿）').padEnd(16, ' '),
      y(Boolean(r.audio)).padEnd(3),
      y(r.aligned).padEnd(3),
      y(r.structured).padEnd(3),
      y(r.summary).padEnd(3),
      y(r.summary_v2).padEnd(3),
      y(r.on_site).padEnd(3),
      r.blocked ?? '（完成）',
    ].join(' '),
  );
}

const tally = {};
for (const r of rows) tally[r.blocked ?? '（完成）'] = (tally[r.blocked ?? '（完成）'] ?? 0) + 1;
console.log('\n小計：' + Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('這一支不呼叫模型也不寫檔；要真的補，等 RF-1126 的一次做完腳本。');
