// 呼叫 Opus 的那一層。**兩條路，先看哪一條真的通得了**：
//
// 1. `api` —— Anthropic Messages API，`ANTHROPIC_API_KEY`。
//    key 從環境變數或 `~/.ryvn-finance/env` 讀，**值一個字都不印**（CLAUDE.md：token 不進對話）。
// 2. `cli` —— 這台機器上的 `claude -p --output-format json`（OAuth 憑證，不用 key）。
//    repo 裡已經有兩支排程在用這條（ryvn-finance `autonomy/runners/research-scan.sh`、
//    `scripts/auditor_run.sh`），所以它不是新東西。
//
// **2026-09-23 量到 `~/.ryvn-finance/env` 裡沒有 `ANTHROPIC_API_KEY`**（九個 key 名，沒有這一把），
// 所以預設是 `cli`；key 給了之後 `--backend api` 就會走 API，兩條回同一個形狀。
//
// 回：{ text, model, usage: { input, output, cache_read, cache_write }, cost_usd, backend }
// `cost_usd` 只有 CLI 那條回得出來（它自己算）；API 那條回 `null`，由呼叫端照價目表算。
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** 只回「有沒有這把 key」與它的值，**永遠不印**。找不到回 null。 */
export const anthropicKey = () => {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const f = path.join(os.homedir(), '.ryvn-finance', 'env');
  if (!fs.existsSync(f)) return null;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?ANTHROPIC_API_KEY\s*=\s*(.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '') || null;
  }
  return null;
};

export const DEFAULT_MODEL = 'claude-opus-5';
const CLI_BIN = process.env.CLAUDE_BIN || path.join(os.homedir(), '.local', 'bin', 'claude');
const SYSTEM = '你是一個把中文逐字稿變成結構化 JSON 的函式。只輸出 JSON，不要任何說明文字。';

/** 巢狀呼叫時要把外層 session 的環境拿掉，不然新的 claude 會去接上層那個 session。 */
const cleanEnv = () => {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^CLAUDE(CODE)?(_|$)/.test(k)) delete env[k];
  return env;
};

const askCli = async (prompt, { model, timeoutMs }) => {
  const args = [
    '-p', prompt,
    '--model', model,
    '--system-prompt', SYSTEM,
    '--exclude-dynamic-system-prompt-sections',
    '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
    '--output-format', 'json',
    '--max-turns', '1',
  ];
  const { stdout } = await run(CLI_BIN, args, {
    env: cleanEnv(),
    cwd: os.tmpdir(), // 中立目錄：不要把哪個 repo 的 CLAUDE.md 一起載進去
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  const d = JSON.parse(stdout);
  if (d.is_error || (d.terminal_reason && d.terminal_reason !== 'completed')) {
    throw new Error(`claude 回報失敗：terminal_reason=${d.terminal_reason} ${String(d.result ?? '').slice(0, 200)}`);
  }
  const u = d.usage ?? {};
  return {
    text: String(d.result ?? ''),
    model: Object.keys(d.modelUsage ?? {})[0] ?? model,
    usage: {
      input: u.input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      cache_read: u.cache_read_input_tokens ?? 0,
      cache_write: u.cache_creation_input_tokens ?? 0,
    },
    cost_usd: typeof d.total_cost_usd === 'number' ? d.total_cost_usd : null,
    backend: 'cli',
  };
};

const askApi = async (prompt, { model, timeoutMs, maxTokens }) => {
  const key = anthropicKey();
  if (!key) throw new Error('沒有 ANTHROPIC_API_KEY（環境變數與 ~/.ryvn-finance/env 都沒有）');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}：${(await res.text()).slice(0, 300)}`);
  const d = await res.json();
  const u = d.usage ?? {};
  return {
    text: (d.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(''),
    model: d.model ?? model,
    usage: {
      input: u.input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      cache_read: u.cache_read_input_tokens ?? 0,
      cache_write: u.cache_creation_input_tokens ?? 0,
    },
    cost_usd: null,
    backend: 'api',
  };
};

/** 預設挑得通的那一條：有 key 就 API，沒有就 CLI。 */
export const defaultBackend = () => (anthropicKey() ? 'api' : 'cli');

export const ask = async (prompt, opts = {}) => {
  const o = {
    backend: opts.backend ?? defaultBackend(),
    model: opts.model ?? DEFAULT_MODEL,
    timeoutMs: opts.timeoutMs ?? 20 * 60 * 1000,
    maxTokens: opts.maxTokens ?? 16000,
  };
  return o.backend === 'api' ? askApi(prompt, o) : askCli(prompt, o);
};

/** 模型有時候會包一層 ```json；剝掉之後取第一個完整的 JSON 物件。 */
export const parseJsonReply = (text) => {
  let t = String(text ?? '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error(`回覆裡沒有 JSON：${t.slice(0, 200)}`);
  return JSON.parse(t.slice(start, end + 1));
};
