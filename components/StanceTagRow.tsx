import { STANCE, STANCE_ORDER, stancesOf, speakerLabel, type Stance } from '@/lib/content';

type Item = { ticker: string; display_name: string; stance: Stance; stances?: Stance[]; speaker?: string | null };

/** 立場 tag 列：看多 / 看空 / 保留 / 提到但無立場，chip 上直接帶個股名與說話者。 */
export default function StanceTagRow({ items }: { items: Item[] }) {
  const buckets = STANCE_ORDER.map((s) => ({
    stance: s,
    items: items.filter((i) => stancesOf({ stance: i.stance, stances: i.stances }).includes(s)),
  })).filter((b) => b.items.length > 0);

  if (buckets.length === 0) return <p className="text-sm text-slate-500">立場待補</p>;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {buckets.flatMap((b) =>
        b.items.map((i) => (
          <li
            key={`${b.stance}-${i.ticker}`}
            className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 text-[14px] ${STANCE[b.stance].cls}`}
          >
            <span className="font-medium">{STANCE[b.stance].label}</span>
            <span>{i.display_name}</span>
            <span className="text-sm opacity-70">{speakerLabel(i.speaker ?? null)}</span>
          </li>
        )),
      )}
    </ul>
  );
}
