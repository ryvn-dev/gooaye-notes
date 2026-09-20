import { STANCE, stancesOf, type Stance } from '@/lib/content';

export default function StanceChips({ stance, stances }: { stance: Stance; stances?: Stance[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {stancesOf({ stance, stances }).map((s) => (
        <span key={s} className={`inline-block rounded-full px-2 py-0.5 text-sm ${STANCE[s].cls}`}>
          {STANCE[s].label}
        </span>
      ))}
    </span>
  );
}
