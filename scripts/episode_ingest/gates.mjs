// 站端把「這一列要送進哪一段、引用句是那一段的第幾句」算好，
// 規則本身交給 ryvn-finance 的 `py/ryvn_finance/podcasts/stance_gates.py`
// （轉接在 `stance_gates.py`）。**四條規則只有一份實作。**
//
// 這一支被兩個人用：`summarise.mjs`（寫檔前擋）與 `gates.test.mjs`
// （黃金集 EP698 必須過同一組閘門 —— 閘門改壞了，那一集會先紅）。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { pIndex } from './blocks.mjs';
import { FIN } from './sources.mjs';
import { splitSentences } from '../sentences.mjs';
import { mentionsTicker } from '../aliases.mjs';

const bare = (t) => String(t ?? '').replace(/[^一-鿿A-Za-z0-9]/g, '');

const secs = (t) => {
  const m = String(t ?? '').match(/^(\d+):(\d+):(\d+)$/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
};

/**
 * 摘要 JSON 的 `tickers[]` → 閘門要的那一列。
 *
 * 段落怎麼定位，依序三條：
 * 1. `p-<n>`（v2.1 之後每一列都有，`summarise.mjs` 沒有 `p` 就不寫檔）；
 * 2. 引用句逐字出現在哪一段（社群稿是逐字的，找得到）；
 * 3. **時間碼 `t`** —— EP696–698 那三集只有 whisper 稿，原話被整理過
 *    （`quote_publishable: false`），逐字找一定找不到，但 `t` 指得回去。
 */
export const buildGateRows = (blocks, rows) => {
  const cache = new Map();
  const sentsOf = (bi) => {
    if (!cache.has(bi)) {
      const b = blocks[bi];
      cache.set(bi, !b || b.kind === 'h2' ? [] : splitSentences(b.text));
    }
    return cache.get(bi);
  };
  const findAnywhere = (q) => {
    if (!q) return -1;
    return blocks.findIndex((b) => b.kind !== 'h2' && bare(b.text).includes(q));
  };

  // 時間碼 → 段：t 不大於它的最後一段（小標沒有時間碼，跳過）。
  const byTime = (tsec) => {
    if (tsec === null) return -1;
    let best = -1;
    for (const [i, b] of blocks.entries()) {
      if (b.kind === 'h2' || b.t === null || b.t === undefined) continue;
      if (b.t <= tsec + 30) best = i; else break;
    }
    return best;
  };

  return rows.map((r) => {
    const q = bare(r.quote ?? '');
    let bi = pIndex(r.p);
    if (bi === null || !blocks[bi]) bi = findAnywhere(q);
    if (bi < 0) {
      bi = byTime(secs(r.t));
      // 時間碼是**段的起點**，講到那一檔的可能是下一段（或上一段的尾巴）。
      // 只在 ±3 段內找有提到那一檔的那一段 —— 找不到就留在原地，讓 `named` 自己紅。
      if (bi >= 0 && !mentionsTicker(blocks[bi].text, r.ticker)) {
        for (let d = 1; d <= 3; d++) {
          const cand = [bi + d, bi - d].find(
            (j) => blocks[j] && blocks[j].kind !== 'h2' && mentionsTicker(blocks[j].text, r.ticker),
          );
          if (cand !== undefined) { bi = cand; break; }
        }
      }
    }
    const b = bi >= 0 ? blocks[bi] : null;
    const sents = bi >= 0 ? sentsOf(bi) : [];
    let idx = sents.findIndex((s) => bare(s).includes(q) || (q && q.includes(bare(s))));
    if (idx < 0) idx = 0;
    return {
      ticker: r.ticker,
      p: r.p ?? (bi >= 0 ? `p-${bi}` : null),
      quote: r.quote ?? '',
      paragraph_kind: b?.kind === 'quote' ? 'quote' : 'p',
      sentences: sents,
      idx,
      alias_hits: [],
      // 同段同檔留哪一筆：原話真的在那一段裡的優先，他自己講的比轉述的優先。
      score: (q && sents.some((s) => bare(s).includes(q)) ? 2 : 0) + (r.basis === 'stated' ? 1 : 0),
      // 站端自己多守一條：那一段沒有提到這一檔就不該標（`check:marks` 也在守同一件事）。
      named: Boolean(b && mentionsTicker(b.text, r.ticker)),
      block: bi,
      t: b?.t ?? null,
    };
  });
};

/** 四個機械閘門（RF-1124）。回 { verdicts, dropped }。 */
export const runGates = async (rows) => {
  if (!rows.length) return { verdicts: [], dropped: [] };
  const payload = rows.map(({ named, block, t, ...r }) => { void named; void block; void t; return r; });

  // **直接用 py/.venv 的直譯器，不走 `uv run`。** 2026-09-23 02:0x：ryvn-finance 那邊
  // 有別條 lane 在同一個 project 跑 `uv run`，uv 的環境鎖把這一支卡住（閘門本身 <0.1 秒）。
  // venv 不在就退回 uv，讓沒 sync 過的機器還跑得動。
  const venv = path.join(FIN, 'py', '.venv', 'bin', 'python3');
  const script = path.join(import.meta.dirname, 'stance_gates.py');
  const [cmd, args] = fs.existsSync(venv)
    ? [venv, [script]]
    : ['uv', ['run', '--project', 'py', 'python', script]];

  // **一定要自己寫 stdin 再關掉。** `execFile`（非同步）沒有 `input` 選項 ——
  // 只有 `execFileSync` 有。2026-09-23 02:0x 拿 `execFile(..., { input })` 跑，
  // python 端 `json.load(sys.stdin)` 等一個永遠不會關的管子，每一次閘門都卡滿 5 分鐘 timeout。
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: FIN, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('閘門超時（120 秒）')); }, 120000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`stance_gates.py 結束碼 ${code}：${err.trim().slice(-500)}`));
      try { resolve(JSON.parse(out)); } catch (e) { reject(new Error(`閘門回的不是 JSON：${e.message}`)); }
    });
    child.stdin.end(JSON.stringify({ rows: payload }));
  });
};
