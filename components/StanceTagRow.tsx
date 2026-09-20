import { stancesOf, type Stance } from '@/lib/content';
import StanceIcon from '@/components/StanceIcon';

type Item = { ticker: string; display_name: string; stance: Stance; stances?: Stance[]; jev_prob?: number | null };

/** 代碼＋一個小折線 icon，沒有外框、沒有文字標籤。 */
export default function StanceTagRow({ items, max }: { items: Item[]; max?: number }) {
  const rows = (max ? items.slice(0, max) : items).map((i) => ({
    ...i,
    s: stancesOf({ stance: i.stance, stances: i.stances })[0] ?? ('mentioned' as Stance),
  }));
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {rows.map((i) => (
        <li key={i.ticker} className="inline-flex items-center gap-1 text-[14px] text-[#6b6b6b]">
          <span className="font-mono">{i.ticker.replace('TW:', '')}</span>
          <StanceIcon stance={i.s} p={i.jev_prob ?? null} />
        </li>
      ))}
    </ul>
  );
}
