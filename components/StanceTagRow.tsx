import { stancesOf, type Perf, type Stance } from '@/lib/content';
import PerfChip from '@/components/PerfChip';

type Item = {
  ticker: string;
  display_name: string;
  stance: Stance;
  stances?: Stance[];
  jev_prob?: number | null;
  perf?: Perf | null;
  first_anchor?: string | null;
};

/** 代碼＋一個小折線 icon，沒有外框、沒有文字標籤；hover 出現那次提及之後的漲跌。 */
export default function StanceTagRow({ items, max }: { items: Item[]; max?: number }) {
  const rows = max ? items.slice(0, max) : items;
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {rows.map((i) => (
        <li key={i.ticker}>
          <PerfChip
            ticker={i.ticker}
            stance={stancesOf({ stance: i.stance, stances: i.stances })[0] ?? 'mentioned'}
            p={i.jev_prob ?? null}
            perf={i.perf ?? null}
            href={i.first_anchor ? `#${i.first_anchor}` : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
