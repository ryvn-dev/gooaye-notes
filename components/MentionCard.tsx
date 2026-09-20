import Link from 'next/link';
import { mmss, pct, speakerLabel, tickerSlug, type Mention } from '@/lib/content';
import StanceChips from '@/components/StanceChips';
import TimecodeButton from '@/components/TimecodeButton';

export default function MentionCard({ m }: { m: Mention }) {
  const code = m.ticker.replace('TW:', '');
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Link href={`/ticker/${tickerSlug(m.ticker)}/`} className="text-[17px] font-semibold underline underline-offset-2">
          {m.display_name}
        </Link>
        <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{code}</span>
        <StanceChips stance={m.stance} stances={m.stances} />
        <span className="text-sm text-slate-500 dark:text-slate-400">{speakerLabel(m.speaker)}</span>
        {m.mention_count !== null && (
          <span className="ml-auto whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
            提到 {m.mention_count} 次
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <TimecodeButton seconds={m.t ?? m.first_ts_s} label={mmss(m.t ?? m.first_ts_s)} />
        <span className="text-slate-500 dark:text-slate-400">
          Jev 讀法 {m.jev_prob === null ? '—' : `${Math.round(m.jev_prob * 100)}%`}
        </span>
        <a
          href={m.yahoo_url}
          rel="noopener nofollow"
          className="underline underline-offset-2 text-slate-600 dark:text-slate-300"
        >
          Yahoo Finance
        </a>
      </div>

      <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300">
        {m.quote ? `「${m.quote.slice(0, 60)}」` : '原話待補'}
      </p>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        {(['px_1d', 'px_5d', 'px_21d'] as const).map((k, i) => (
          <div key={k} className="flex gap-1 whitespace-nowrap">
            <dt>提到後 {[1, 5, 21][i]} 日</dt>
            <dd className="font-mono tabular-nums">{m[k] === null ? '待補' : pct(m[k])}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
