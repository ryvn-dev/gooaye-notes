import Link from 'next/link';
import { mmss, pct, tickerSlug, stancesOf, type Mention } from '@/lib/content';
import TimecodeButton from '@/components/TimecodeButton';
import StanceIcon from '@/components/StanceIcon';

/** 無框細線表格的一列。 */
export default function MentionCard({ m }: { m: Mention }) {
  const s = stancesOf(m)[0] ?? 'mentioned';
  const t = m.t ?? m.first_ts_s;
  return (
    <tr className="border-b border-[#eee] align-top">
      <td className="py-3 pr-3">
        <span className="inline-flex items-center gap-1">
          <Link href={`/ticker/${tickerSlug(m.ticker)}/`} className="font-semibold underline underline-offset-2">
            {m.display_name}
          </Link>
          <StanceIcon stance={s} p={m.jev_prob} />
          {m.speaker && <span className="text-[13px] text-[#6b6b6b]">{m.speaker}</span>}
        </span>
        {m.quote && <p className="mt-1 text-[15px] text-[#6b6b6b]">「{m.quote.slice(0, 60)}」</p>}
      </td>
      <td className="py-3 pr-3 whitespace-nowrap">
        <TimecodeButton seconds={t} label={mmss(t)} />
      </td>
      <td className="py-3 pr-3 whitespace-nowrap text-right text-[15px] text-[#6b6b6b]">
        {m.px_5d === null ? '—' : pct(m.px_5d)}
      </td>
      <td className="py-3 whitespace-nowrap text-right text-[15px] text-[#6b6b6b]">
        <a href={m.yahoo_url} rel="noopener nofollow" className="underline underline-offset-2">
          報價
        </a>
      </td>
    </tr>
  );
}
