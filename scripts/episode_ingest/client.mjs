// 呼叫 Opus 的那一層。**只有一條路：訂閱制 CLI**。
//
// `cli` —— 這台機器上的 `claude -p --output-format json`（OAuth 憑證，不用 key）。
// repo 裡已經有兩支排程在用這條（ryvn-finance `autonomy/runners/research-scan.sh`、
// `scripts/auditor_run.sh`），所以它不是新東西。
//
// **以 key 計費的 Messages API 路徑由主人拍板禁止**（2026-09-23）：
// 「不能用 api 沒儲值也絕對不能用 用訂閱」「直接把key那個做法刪掉」。
// 這一層因此不讀任何 key、不打任何 HTTP endpoint；要再開那條路要先有新的拍板。
//
// 回：{ text, model, usage: { input, output, cache_read, cache_write }, cost_usd, backend }
// `cost_usd` 由 CLI 自己算。
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

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

export const ask = async (prompt, opts = {}) => {
  const o = {
    model: opts.model ?? DEFAULT_MODEL,
    timeoutMs: opts.timeoutMs ?? 20 * 60 * 1000,
  };
  return askCli(prompt, o);
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
