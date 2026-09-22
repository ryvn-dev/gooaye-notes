// 黃金集必須過同一組閘門（`RF-1124`）。
//
// 為什麼是**黃金集**而不是造一個假資料：這四條規則是拿 2026-09-21 那次線上稽核
// 的錯例訂出來的，而 EP691–693／EP696–698 是訂完之後人看過、上了站的那六集。
// 規則改壞了 —— 例如有人為了讓某一列變綠去動轉折詞表 —— 這六集會先紅。
//
//   npm run test:gates
//
// 依賴本機快取（`~/.ryvn-finance/podcasts/gooaye/site-json`）與 `uv`：
// CI 兩樣都沒有，所以這一支**不掛在 build 上**，拿不到素材就整份 skip 並說出缺什麼。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { parseStructured } from './blocks.mjs';
import { buildGateRows, runGates } from './gates.mjs';

const CACHE = process.env.GOOAYE_CACHE || path.join(os.homedir(), '.ryvn-finance', 'podcasts', 'gooaye');
const SJ = path.join(CACHE, 'site-json');
const GOLDEN = [698, 697, 696, 693, 692, 691];

const have = (ep) =>
  fs.existsSync(path.join(SJ, 'summaries', `EP${ep}.json`)) &&
  fs.existsSync(path.join(SJ, 'transcripts', `EP${ep}.structured.md`));

for (const ep of GOLDEN) {
  test(`EP${ep} 黃金摘要通過四個機械閘門`, { skip: have(ep) ? false : `本機沒有 EP${ep} 的素材（${SJ}）` }, async () => {
    const sum = JSON.parse(fs.readFileSync(path.join(SJ, 'summaries', `EP${ep}.json`), 'utf8'));
    const blocks = parseStructured(fs.readFileSync(path.join(SJ, 'transcripts', `EP${ep}.structured.md`), 'utf8'));
    assert.ok(blocks.length > 20, `EP${ep} 段落只有 ${blocks.length} 段，structured.md 解壞了`);
    assert.equal(sum.schema, 'summary-v2.1');
    assert.ok((sum.tickers ?? []).length > 0, `EP${ep} 一列立場都沒有`);

    const rows = buildGateRows(blocks, sum.tickers);
    const { verdicts, dropped } = await runGates(rows);

    const rejected = verdicts.filter((v) => v.verdict === 'reject');
    assert.deepEqual(
      rejected.map((v) => `${v.ticker}：${v.reason}`),
      [],
      `EP${ep} 有列被閘門擋下來`,
    );
    // one_per_paragraph：黃金集本來就是每檔每段一筆，所以不該丟掉任何一筆。
    assert.deepEqual(dropped.map((i) => `${rows[i].ticker} ${rows[i].p}`), [], `EP${ep} 有同段同檔重複的列`);
    // 每一列都要指得回真的講到那一檔的那一段（`check:marks` 守的是同一件事）。
    assert.deepEqual(
      rows.filter((r) => !r.named).map((r) => `${r.ticker} ${r.p}`),
      [],
      `EP${ep} 有列的段落根本沒提到那一檔`,
    );
  });
}
