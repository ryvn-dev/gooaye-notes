import Link from 'next/link';
import { STANCE, tickerSlug, type Stance } from '@/lib/content';

export default function TickerChip({
  ticker,
  name,
  stance,
  muted = false,
}: {
  ticker: string;
  name: string;
  stance: Stance;
  muted?: boolean;
}) {
  const label = `${name}${name === ticker ? '' : `（${ticker.replace('TW:', '')}）`}`;
  const cls = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[15px] ${STANCE[stance].cls}`;
  if (muted) return <span className={cls}>{label}</span>;
  return (
    <Link href={`/ticker/${tickerSlug(ticker)}/`} className={`${cls} hover:opacity-80`}>
      {label}
    </Link>
  );
}
