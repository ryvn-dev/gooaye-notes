import { chipStance, type Perf, type Stance } from '@/lib/content';
import PerfChip from '@/components/PerfChip';

type Item = {
  ticker: string;
  display_name: string;
  short_name?: string | null;
  stance: Stance;
  stances?: Stance[];
  jev_prob?: number | null;
  perf?: Perf | null;
  first_anchor?: string | null;
};

/**
 * 代碼＋簡稱＋立場 icon，沒有外框；hover 出現那次提及之後的漲跌。
 * 單行水平捲動（捲軸藏起來、右緣淡出）：截成前三檔的話，旁邊那個「提及 N 檔」就對不上了。
 */
export default function StanceTagRow({ items, max }: { items: Item[]; max?: number }) {
  const rows = max ? items.slice(0, max) : items;
  if (rows.length === 0) return null;
  return (
    <div className="relative">
      <ul data-chiprow={rows.length} className="no-scrollbar flex gap-x-4 overflow-x-auto whitespace-nowrap">
      {rows.map((i) => (
        <li key={i.ticker} className="shrink-0">
          <PerfChip
            ticker={i.ticker}
            name={i.short_name ?? i.display_name}
            stance={chipStance(i)}
            stances={i.stances}
            p={i.jev_prob ?? null}
            perf={i.perf ?? null}
            href={i.first_anchor ? `#${i.first_anchor}` : undefined}
          />
        </li>
      ))}
      </ul>
      <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
