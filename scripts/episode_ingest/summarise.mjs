// 第 3 步：**排版 ＋ 摘要 ＋ 段落級立場**，一支腳本做完（`RF-1126`）。
//
// 以前這一關是「開一次 session、把 prompt 貼進去」——12 集就是 12 次
// （`docs/plan-2026-09-23.md` §A1 第 3 步、§B1）。這一支把那件事變成可重跑、可排程的東西：
//
//   node scripts/episode_ingest/summarise.mjs --episode 694
//   node scripts/episode_ingest/summarise.mjs --from 681 --to 690 --dry-run
//
// 兩條路徑，差別只在**逐字稿哪裡來**（計畫 §B2 的 adapter）：
//
// - `community`（EP≤693 有社群稿）：`structured.md` 由 `structure-transcript.mjs`
//   **機械**產生（內文一個字都不改），模型只出摘要與立場。
// - `own-whisper`（EP≥694）：模型先把我們自己的 whisper 稿整理成 `structured.md`
//   （只准動標點／簡繁／錯字，`check-structured.mjs` 用 0.90 相似度守著），再出摘要與立場。
//
// **閘門沒過就不寫檔。** 四個機械立場閘門（`RF-1124`）走 ryvn-finance 那一份實作，
// 由 `stance_gates.py` 轉接；`quote_gate` ／ `entity_gate` 判 `reject` 的列直接丟掉，
// `flip_gate` 判 `needs_review` 的列留著但標灰點（那是正常結果，不是紅燈）。
//
// 每一集另外落一張帳到 `content/_meta/EP<n>.ingest.json`：模型、prompt 雜湊、
// token、美元。**那個資料夾不上站**（`lib/content.ts` 不讀它），它是成本與可複核性的帳。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as OpenCC from 'opencc-js';

import { ask, defaultBackend, parseJsonReply, DEFAULT_MODEL } from './client.mjs';
import { numbered, parseStructured, pIndex } from './blocks.mjs';
import { buildGateRows, runGates } from './gates.mjs';
import {
  NOTES_MAX_RATIO, NOTES_QUOTE_MAX, SHOWS, displayModeOf, listEpisodes, pickSource, showById,
} from './sources.mjs';
import { structure, render } from '../structure-transcript.mjs';
import { checkEpisode } from '../check-structured.mjs';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PROMPTS = path.join(import.meta.dirname, 'prompts');
const META = path.join(ROOT, 'content', '_meta');
const NAMES = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'ticker-names.json'), 'utf8'));
const SCHEMA = 'summary-v2.1';

// 白話規矩的禁字（`docs/podcast-summary-schema.md` 末節）。`segment_tags` 不受這一條管。
const BANNED = ['模型', '買進', '賣出', '建議', '目標價', 'Jev', '簡單說', '簡單講'];

const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes(`--${n}`);

// 進度只印到 stderr：一次呼叫要好幾分鐘，沒有這幾行就分不出「在跑」與「卡住」。
const step = (msg) => process.stderr.write(`  · ${msg}\n`);

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const hhmmss = (s) => {
  if (s === null || s === undefined) return null;
  const n = Math.max(0, Math.round(s));
  return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60]
    .map((x) => String(x).padStart(2, '0'))
    .join(':');
};
// 逐行轉繁（s2twp）。**整篇一次轉會讓字元位移偏掉** —— 位移是引原話與算視窗的依據
// （ryvn-finance `docs/podcast-pipeline.md` 第 2 步的紅燈）。
const s2twp = OpenCC.Converter({ from: 'cn', to: 'twp' });
const bare = (t) => String(t ?? '').replace(/[^一-鿿A-Za-z0-9]/g, '');

const TICKER_TABLE = Object.entries(NAMES)
  .filter(([, v]) => v?.confirmed)
  .map(([t, v]) => `${t}＝${v.name}`)
  .join('・');

const fill = (tpl, vars) =>
  Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)), tpl);

/**
 * 成本與可複核性的帳：模型、prompt 雜湊、token、美元。
 * **不上站**（`content/_meta` 不在 `lib/content.ts` 的讀取範圍，`next build` 也不吃它）。
 * **跑失敗也要寫** —— token 已經花掉了，不記就量不出「今晚花了多少」。
 */
const writeMeta = (ep, show, mode, ledger, extra = {}) => {
  const tot = ledger.reduce(
    (a, l) => ({
      input: a.input + l.usage.input,
      output: a.output + l.usage.output,
      cache_read: a.cache_read + l.usage.cache_read,
      cache_write: a.cache_write + l.usage.cache_write,
      cost_usd: a.cost_usd + (l.cost_usd ?? 0),
    }),
    { input: 0, output: 0, cache_read: 0, cache_write: 0, cost_usd: 0 },
  );
  fs.mkdirSync(META, { recursive: true });
  // **沿用快取的那一趟不可以把上一趟的帳洗掉。** 2026-09-23：EP694 第一趟花了錢但在閘門紅，
  // 第二趟 `--reuse-raw` 免費跑完，帳被覆寫成 0，那一集的花費就再也量不回來了。
  // 新的一趟沒有付費呼叫時，保留舊帳的 `calls`／`totals`，只更新結果欄位。
  const metaFile = path.join(META, `EP${String(ep).padStart(4, '0')}.ingest.json`);
  const prev = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : null;
  const paid = tot.cost_usd > 0;
  const calls = paid ? ledger : [...(prev?.calls ?? []), ...ledger.map((l) => ({ stage: l.stage, cost_usd: 0 }))];
  const totals = paid ? tot : (prev?.totals ?? tot);
  fs.writeFileSync(
    metaFile,
    JSON.stringify(
      {
        ep, show: show.id, mode, schema: SCHEMA,
        generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
        backend: ledger[0]?.backend ?? null,
        model: ledger[ledger.length - 1]?.model ?? DEFAULT_MODEL,
        prompt_files: {
          summary: 'scripts/episode_ingest/prompts/summary-v2.1.md',
          ...(mode === 'own-whisper' ? { clean: 'scripts/episode_ingest/prompts/clean-own-whisper-v1.md' } : {}),
        },
        calls: paid
          ? ledger.map((l) => ({
            stage: l.stage ?? 'summary', prompt_sha256: l.prompt_sha256,
            model: l.model, usage: l.usage, cost_usd: l.cost_usd,
          }))
          : calls,
        totals: { ...totals, cost_usd: Number(totals.cost_usd.toFixed(4)) },
        ...(paid ? {} : { cost_from_earlier_run: Boolean(prev) }),
        ...extra,
      },
      null,
      2,
    ) + '\n',
  );
  return tot;
};

// ── 逐字稿來源 ──────────────────────────────────────────────────────────────

/** 社群稿路徑：對齊器的輸出 → 機械排版 → `structured.md`。模型不碰正文。 */
const buildCommunityStructured = (show, ep) => {
  const dir = path.join(show.cache, 'site-json', 'transcripts');
  const aligned = path.join(dir, `EP${ep}.json`);
  if (!fs.existsSync(aligned)) {
    throw new Error(
      `EP${ep} 還沒對齊：缺 ${aligned}\n` +
        `  先在 ryvn-finance 跑：uv run --project py python py/tools/podcast_align.py --map "EP${ep}=<日期>"`,
    );
  }
  const segs = JSON.parse(fs.readFileSync(aligned, 'utf8')).segments;
  const hf = path.join(ROOT, 'headings', `EP${ep}.json`);
  const extra = fs.existsSync(hf) ? JSON.parse(fs.readFileSync(hf, 'utf8')) : [];
  const md = render(structure(segs, extra));
  fs.writeFileSync(path.join(dir, `EP${ep}.structured.md`), md);
  return md;
};

/** 自家 whisper 路徑：模型整理標點與錯字，內容不准動（0.90 相似度閘門守著）。 */
const buildOwnWhisperStructured = async (show, epi, opts, ledger) => {
  const ep = epi.ep;
  const dir = path.join(show.cache, 'site-json', 'transcripts');
  const src = path.join(show.cache, 'transcripts', `${epi.episode_id}.json`);
  const segs = JSON.parse(fs.readFileSync(src, 'utf8')).segments ?? [];
  if (!segs.length) throw new Error(`EP${ep} 的 whisper 稿是空的：${src}`);

  // 一次吃完長集會掉段（`docs/podcast-pipeline.md` 第 3 步）：切成 ≤9,000 字一塊。
  const CHUNK = 9000;
  const chunks = [];
  let cur = [];
  let chars = 0;
  for (const s of segs) {
    cur.push(s);
    chars += String(s.text ?? '').length;
    if (chars >= CHUNK) { chunks.push(cur); cur = []; chars = 0; }
  }
  if (cur.length) chunks.push(cur);

  const tpl = fs.readFileSync(path.join(PROMPTS, 'clean-own-whisper-v1.md'), 'utf8');
  const parts = [];
  for (const [i, chunk] of chunks.entries()) {
    const body = chunk
      .map((s) => `[t=${Math.round(s.start ?? 0)}] ${s2twp(String(s.text ?? '').trim())}`)
      .join('\n');
    const prompt = fill(tpl, {
      CHUNK_NO: i + 1,
      CHUNK_TOTAL: chunks.length,
      CHUNK_NOTE:
        i === 0
          ? '這是整集的開頭，通常第一段就是業配。'
          : '這一塊是從中間切開的，第一句可能接著上一塊的句子 —— 照原樣寫，不要補開場白。',
      BODY: body,
    });
    step(`EP${ep} 清稿 ${i + 1}/${chunks.length}（${body.length} 字）`);
    const res = await ask(prompt, opts);
    ledger.push({ stage: `clean-${i + 1}/${chunks.length}`, prompt_sha256: sha(prompt), ...res, text: undefined });
    parts.push(res.text.replace(/^```(?:markdown)?\s*|\s*```$/g, '').trim());
  }

  const md =
    `<!-- source: own-whisper-cleaned source_id: own-whisper:${epi.episode_id} -->\n\n` +
    parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() +
    '\n';
  fs.writeFileSync(path.join(dir, `EP${ep}.structured.md`), md);
  return md;
};

// ── 一集 ────────────────────────────────────────────────────────────────────

const doEpisode = async (show, epi, opts) => {
  const ep = epi.ep;
  const dir = path.join(show.cache, 'site-json', 'transcripts');
  const sumFile = path.join(show.cache, 'site-json', 'summaries', `EP${ep}.json`);
  const ledger = [];
  const src = pickSource(show, epi);
  if (!src) throw new Error(`EP${ep} 沒有任何逐字稿來源`);
  const mode = src.adapter.kind === 'community' ? 'community' : 'own-whisper';

  if (!opts.force && fs.existsSync(sumFile) && fs.existsSync(path.join(dir, `EP${ep}.structured.md`))) {
    return { ep, skipped: '已經有 structured.md 與摘要（要重做加 --force）' };
  }

  // 1. structured.md
  let md;
  if (opts.dryRun) {
    md = fs.existsSync(path.join(dir, `EP${ep}.structured.md`))
      ? fs.readFileSync(path.join(dir, `EP${ep}.structured.md`), 'utf8')
      : mode === 'community'
        ? buildCommunityStructured(show, ep)
        : null;
    if (!md) return { ep, mode, dry: '要呼叫模型才產得出 structured.md（own-whisper），dry-run 停在這裡' };
  } else {
    // own-whisper 的清稿是整集最貴的一段（一集 6–8 次呼叫）。已經清好而且逐字閘門
    // 過得了的 `structured.md` 就直接用 —— 要重清加 `--reclean`。
    const built = path.join(dir, `EP${ep}.structured.md`);
    md = mode === 'community'
      ? buildCommunityStructured(show, ep)
      : !opts.reclean && fs.existsSync(built)
        ? fs.readFileSync(built, 'utf8')
        : await buildOwnWhisperStructured(show, epi, opts, ledger);
  }

  // 逐字閘門（社群稿逐字相等 / 自家稿 0.90 相似度）先過，過不了就不要花第二次呼叫。
  const g = checkEpisode(ep);
  if (!g.ok) throw new Error(`EP${ep} 逐字閘門紅：${g.src} ${g.md ?? ''}`);

  const blocks = parseStructured(md);
  if (!blocks.length) throw new Error(`EP${ep} 的 structured.md 解不出段落`);

  // 2. 摘要 ＋ 段落級立場
  const tpl = fs.readFileSync(path.join(PROMPTS, 'summary-v2.1.md'), 'utf8');
  const prompt = fill(tpl, {
    TICKER_TABLE,
    EP: `EP${ep}`,
    PUBLISHED: epi.published,
    TITLE: epi.title ?? `EP${ep}`,
    BODY: numbered(blocks),
    NOTES_SECTION: opts.notes
      ? fs.readFileSync(path.join(PROMPTS, 'notes-v1.md'), 'utf8').trim()
      : '（這一集不是 `notes` 模式，不要輸出 `notes` 欄位。）',
  });
  if (opts.dryRun) {
    return {
      ep, mode, dry: true,
      blocks: blocks.length,
      prompt_chars: prompt.length,
      prompt_sha256: sha(prompt).slice(0, 12),
      structured_sim: g.sim ?? null,
    };
  }

  // `--reuse-raw`：上一次的模型回覆還在快取就直接用，不再呼叫一次。
  // 站端的檢查／閘門改了而模型回覆沒變的時候（2026-09-23 那次閘門 stdin 臭蟲），
  // 重跑不該再花一次錢；快取在 repo 外，回覆本身也還是可複核的。
  const rawFile = path.join(show.cache, 'site-json', 'summaries', `EP${ep}.raw.json`);
  let res;
  if (opts.reuseRaw && fs.existsSync(rawFile)) {
    step(`EP${ep} 沿用快取回覆（${rawFile}）`);
    res = {
      text: fs.readFileSync(rawFile, 'utf8'),
      model: DEFAULT_MODEL, backend: 'cache', cost_usd: 0,
      usage: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
    };
  } else {
    step(`EP${ep} 摘要呼叫（${blocks.length} 段・prompt ${prompt.length} 字）`);
    res = await ask(prompt, opts);
  }
  ledger.push({ stage: opts.reuseRaw && res.backend === 'cache' ? 'summary-cached' : 'summary', prompt_sha256: sha(prompt), ...res, text: undefined });
  // 原始回覆落在**快取**（repo 外）：跑失敗的時候看得到模型到底回了什麼，
  // 不用再花一次錢。進 repo 的只有 content/_meta 那張帳。
  fs.writeFileSync(rawFile, res.text);
  const out = parseJsonReply(res.text);

  // 3. 形狀檢查 —— 模型回的東西一律不信，對不上就不寫
  const problems = [];
  if (!out.summary_answer_first || !out.summary) problems.push('缺 summary_answer_first 或 summary');
  const text = `${out.summary_answer_first ?? ''}${out.summary ?? ''}${(out.key_points ?? []).map((k) => k.text).join('')}`;
  for (const w of BANNED) if (text.includes(w)) problems.push(`摘要出現禁字「${w}」`);

  const raw = (out.tickers ?? []).filter((r) => {
    const pi = pIndex(r.p);
    if (pi === null || !blocks[pi]) { problems.push(`${r.ticker} 的 p 對不到段：${r.p}`); return false; }
    if (!NAMES[r.ticker]?.confirmed) { problems.push(`表上沒有這個代號：${r.ticker}`); return false; }
    return true;
  });
  const rows = buildGateRows(blocks, raw);

  // 4. 四個機械閘門（RF-1124）
  step(`EP${ep} 閘門（${rows.length} 列）`);
  const { verdicts, dropped } = await runGates(rows);
  const drop = new Set(dropped);
  const tickers = [];
  const rejected = [];
  for (const [i, row] of rows.entries()) {
    const v = verdicts[i];
    if (v.verdict === 'reject') { rejected.push(`${row.ticker} ${row.p}：${v.reason}`); continue; }
    if (drop.has(i)) { rejected.push(`${row.ticker} ${row.p}：one_per_paragraph 同段重複`); continue; }
    if (!row.named) { rejected.push(`${row.ticker} ${row.p}：那一段沒有提到這一檔`); continue; }
    const r = raw[i];
    tickers.push({
      ticker: r.ticker,
      p: r.p,
      speaker: '主持人',
      stance: Array.isArray(r.stance) ? r.stance : [r.stance].filter(Boolean),
      basis: r.basis ?? '',
      quote: r.quote ?? '',
      caveat: r.caveat ?? '',
      reason: r.reason ?? '',
      t: hhmmss(row.t),
      ...(mode === 'own-whisper' ? { quote_publishable: false } : {}),
      needs_review: Boolean(v.needs_review),
    });
  }
  if (!tickers.length && (out.tickers ?? []).length) problems.push('立場列全被閘門擋掉');

  const key_points = (out.key_points ?? [])
    .map((k) => {
      const pi = pIndex(k.p);
      if (pi === null || !blocks[pi]) { problems.push(`重點的 p 對不到段：${k.p}`); return null; }
      return { t: hhmmss(blocks[pi].t), text: k.text, p: k.p };
    })
    .filter(Boolean);
  if (key_points.length < 6) problems.push(`重點只有 ${key_points.length} 筆（要 ≥6）`);

  // 聽打筆記（`notes` 模式，主人 2026-09-23 01:56 拍）。
  // 兩條硬規矩：**整集筆記 ≤ 逐字稿的 35%**、**有立場的段落一定要有 ≤40 字的逐字原話**。
  let notes = null;
  let notesRatio = null;
  if (opts.notes) {
    const bodyChars = blocks.filter((b) => b.kind !== 'h2').reduce((a, b) => a + b.text.length, 0);
    notes = (out.notes ?? [])
      .map((n) => {
        const pi = pIndex(n.p);
        if (pi === null || !blocks[pi]) { problems.push(`筆記的 p 對不到段：${n.p}`); return null; }
        return { p: `p-${pi}`, t: hhmmss(blocks[pi].t), text: String(n.text ?? '').trim() };
      })
      .filter(Boolean)
      .filter((n) => n.text);
    if (!notes.length) problems.push('notes 模式但一條筆記都沒有');
    const noteChars = notes.reduce((a, n) => a + n.text.length, 0);
    notesRatio = bodyChars ? Number((noteChars / bodyChars).toFixed(3)) : null;
    if (notesRatio !== null && notesRatio > NOTES_MAX_RATIO) {
      problems.push(`筆記佔逐字稿 ${(notesRatio * 100).toFixed(1)}%（上限 ${NOTES_MAX_RATIO * 100}%）`);
    }
    // 逐字抄整段的筆記不是筆記：任何一條跟原段一字不差就退回。
    for (const n of notes) {
      const b = blocks[pIndex(n.p)];
      if (b && bare(n.text) && bare(b.text).includes(bare(n.text)) && n.text.length > 20) {
        problems.push(`${n.p} 的筆記是逐字抄的，不是自己的話`);
      }
    }
    for (const t of tickers) {
      const q = String(t.quote ?? '').trim();
      if (!q) problems.push(`${t.ticker} ${t.p}：notes 模式下有立場就一定要有逐字原話`);
      else if (q.length > NOTES_QUOTE_MAX) {
        problems.push(`${t.ticker} ${t.p}：原話 ${q.length} 字，超過 ${NOTES_QUOTE_MAX} 字上限`);
      }
    }
  }

  if (problems.length) {
    // 失敗也要留帳：token 已經花掉了，不記就量不出「今晚花了多少」。
    writeMeta(ep, show, mode, ledger, { error: problems, blocks: blocks.length, sim: g.sim ?? null });
    throw new Error(`EP${ep} 閘門紅，沒有寫檔：\n  - ${problems.join('\n  - ')}`);
  }

  // 5. 落檔（站端只吃 summaries/EP<n>.json 與 summaries/index.json）
  const stanceTags = [];
  for (const t of tickers) {
    for (const s of t.stance) {
      let row = stanceTags.find((x) => x.stance === s);
      if (!row) { row = { speaker: '主持人', stance: s, tickers: [] }; stanceTags.push(row); }
      if (!row.tickers.includes(t.ticker)) row.tickers.push(t.ticker);
    }
  }
  const doc = {
    ep: `EP${ep}`,
    episode_id: epi.episode_id,
    published: epi.published,
    stance_tags: stanceTags,
    summary_answer_first: out.summary_answer_first,
    summary: out.summary,
    key_points,
    segment_tags: out.segment_tags ?? [],
    tickers,
    ...(notes ? { notes, notes_ratio: notesRatio, display: 'notes' } : {}),
    model: ledger[ledger.length - 1]?.model ?? DEFAULT_MODEL,
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    schema: SCHEMA,
  };
  fs.mkdirSync(path.dirname(sumFile), { recursive: true });
  fs.writeFileSync(sumFile, JSON.stringify(doc, null, 2) + '\n');

  // summaries/index.json 就是「站上放哪幾集」那張清單（build-content.mjs 讀它）。
  const idxFile = path.join(show.cache, 'site-json', 'summaries', 'index.json');
  const idx = readJson(idxFile) ?? { generated_at: null, model: null, episodes: [] };
  idx.episodes = (idx.episodes ?? []).filter((e) => String(e.ep) !== `EP${ep}`);
  idx.episodes.push({ ep: `EP${ep}`, published: epi.published, n_key_points: key_points.length, tags: doc.segment_tags });
  idx.episodes.sort((a, b) => String(a.ep).localeCompare(String(b.ep)));
  idx.generated_at = doc.generated_at;
  idx.model = doc.model;
  fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1) + '\n');

  const tot = writeMeta(ep, show, mode, ledger, {
    blocks: blocks.length,
    sim: g.sim ?? null,
    rows_in: rows.length,
    rows_kept: tickers.length,
    needs_review: tickers.filter((t) => t.needs_review).length,
    rejected,
    notes_ratio: notesRatio,
  });

  return {
    ep, mode,
    blocks: blocks.length,
    key_points: key_points.length,
    tickers: tickers.length,
    needs_review: tickers.filter((t) => t.needs_review).length,
    rejected: rejected.length,
    notes: notes?.length ?? 0,
    notes_ratio: notesRatio,
    sim: g.sim ?? null,
    calls: ledger.length,
    tokens: tot,
    cost_usd: Number(tot.cost_usd.toFixed(4)),
  };
};

// ── 入口 ────────────────────────────────────────────────────────────────────

const show = showById(flag('show', SHOWS[0].id));
if (!show) { console.error(`沒有這個節目：${flag('show')}`); process.exit(1); }

const one = flag('episode');
const from = flag('from');
const to = flag('to');
const all = listEpisodes(show);
const wanted = one !== null
  ? all.filter((e) => e.ep === Number(one))
  : all.filter((e) => e.ep !== null && (from === null || e.ep >= Number(from)) && (to === null || e.ep <= Number(to)));
if (!wanted.length) { console.error('沒有指定到任何一集（--episode N 或 --from A --to B）'); process.exit(1); }

const opts = {
  dryRun: has('dry-run'),
  force: has('force'),
  // `notes` 模式：登記表說 `notes` 就是 notes，`--notes` 只是手動覆蓋（測試用）。
  notes: has('notes') || displayModeOf(show) === 'notes',
  reuseRaw: has('reuse-raw'),
  reclean: has('reclean'),
  backend: flag('backend', defaultBackend()),
  model: flag('model', DEFAULT_MODEL),
};
console.log(
  `節目 ${show.name}・${wanted.length} 集（EP${wanted[0].ep}…EP${wanted[wanted.length - 1].ep}）` +
    `・backend=${opts.backend}・model=${opts.model}${opts.dryRun ? '・dry-run' : ''}`,
);

let bad = 0;
const done = [];
for (const epi of wanted) {
  try {
    const r = await doEpisode(show, epi, opts);
    done.push(r);
    console.log(`EP${epi.ep} ${JSON.stringify(r, null, 0)}`);
  } catch (err) {
    bad++;
    console.error(`EP${epi.ep} 失敗：${err.message}`);
  }
}
const money = done.reduce((a, r) => a + (r.cost_usd ?? 0), 0);
console.log(`完成 ${done.length} 集・失敗 ${bad} 集・合計 ${money.toFixed(4)} USD`);
process.exit(bad ? 1 : 0);
