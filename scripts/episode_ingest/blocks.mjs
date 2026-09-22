// 結構化逐字稿（`EP<n>.structured.md`）→ 段落陣列。**段序就是立場錨點 `p-<n>`。**
//
// 口徑寫在 ryvn-finance `docs/podcast-summary-schema.md`：
// `n` 從 0 起算，`## 小標`、廣告段、`>` 引用段**各算一段**，`:::ad` / `:::` 圍籬**不算**。
// 這一份以前在 `build-content.mjs` 裡，摘要腳本也要同一套索引 ——
// 兩邊各寫一次，段序遲早會漂，而立場列全掛在段序上。
//
// 用庫：unified + remark-parse + remark-directive（`:::ad` 是 directive，不是自己 split 字串）。
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import { toString as mdText } from 'mdast-util-to-string';

const T_RE = /^\s*\[t=(\d+)\]\s*/;

/** markdown 字串 → [{ kind: 'h2'|'p'|'quote', t, ad, text }]，索引即 `p-<n>`。 */
export const parseStructured = (md) => {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(md);
  const out = [];
  const push = (kind, raw, ad) => {
    const m = raw.match(T_RE);
    const text = raw.replace(T_RE, '').trim();
    if (!text) return;
    out.push({ kind, t: m ? Number(m[1]) : null, ad, text });
  };
  const walk = (nodes, ad) => {
    for (const n of nodes) {
      if (n.type === 'heading' && n.depth === 2) out.push({ kind: 'h2', text: mdText(n) });
      else if (n.type === 'containerDirective') walk(n.children, n.name === 'ad');
      else if (n.type === 'blockquote') push('quote', n.children.map(mdText).join(''), ad);
      else if (n.type === 'paragraph') push('p', mdText(n), ad);
    }
  };
  walk(tree.children, false);
  return out;
};

/**
 * 摘要要看的那一份：每一段前面掛 **`p-<n>`**（不是 `b<n>`）。
 * 標籤與模型要回填的欄位長得一模一樣 —— 2026-09-23 第一次跑 EP690，
 * 段標籤是 `b27` 而欄位規格是 `p-<段號>`，模型回了 `p-b27`，整集作廢。
 */
export const numbered = (blocks) =>
  blocks
    .map((b, i) => {
      if (b.kind === 'h2') return `p-${i}\t[小標] ${b.text}`;
      const t = b.t === null || b.t === undefined ? '' : ` [t=${b.t}]`;
      const tag = b.ad ? '[贊助段] ' : b.kind === 'quote' ? '[聽眾來信] ' : '';
      return `p-${i}${t}\t${tag}${b.text}`;
    })
    .join('\n');

/** `p-12` → 12。`p-b12` / `b12` / `12` 也收 —— 模型偶爾會把標籤抄進去。 */
export const pIndex = (p) => {
  const m = String(p ?? '').trim().match(/^(?:p-)?b?(\d+)$/);
  return m ? Number(m[1]) : null;
};
