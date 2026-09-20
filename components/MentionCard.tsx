import Link from 'next/link';
import { tickerSlug, stancesOf, type Mention } from '@/lib/content';
import TimecodeButton from '@/components/TimecodeButton';
import PerfChip from '@/components/PerfChip';

/** 無框細線表格的一列：公司名 · 跳到逐字稿那一段 · 提及後漲跌 · 報價連結。 */
export default function MentionCard({ m }: { m: Mention }) {
  const s = stancesOf(m)[0] ?? 'mentioned';
  const t = m.t ?? m.first_ts_s;
  const para = m.first_paragraph;
  return (
    <tr className="border-b border-[#eee] align-top">
      <td className="py-3 pr-3">
        <span className="inline-flex items-center gap-2">
          <Link href={`/ticker/${tickerSlug(m.ticker)}/`} className="font-semibold underline underline-offset-2">
            {m.display_name}
          </Link>
          <PerfChip ticker={m.ticker} stance={s} p={m.jev_prob} perf={m.perf} />
        </span>
        {m.quote && (
          <p className="mt-1 text-[14px] text-[#6b6b6b]">
            {para !== null && para !== undefined ? (
              <a href={`#p-${para}`} className="no-underline">
                「{m.quote.slice(0, 60)}」
              </a>
            ) : (
              <>「{m.quote.slice(0, 60)}」</>
            )}
          </p>
        )}
      </td>
      <td className="py-3 pr-3 whitespace-nowrap">
        <TimecodeButton seconds={t} />
      </td>
      <td className="py-3 whitespace-nowrap text-right text-[14px] text-[#6b6b6b]">
        <a href={m.yahoo_url} rel="noopener nofollow" className="underline underline-offset-2">
          報價
        </a>
      </td>
    </tr>
  );
}
