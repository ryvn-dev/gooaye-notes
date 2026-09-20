import Link from 'next/link';
import type { Metadata } from 'next';
import { getIndex, minutes } from '@/lib/content';
import StanceTagRow from '@/components/StanceTagRow';
import { site, abs } from '@/lib/site';

export const metadata: Metadata = {
  title: `股癌 重點筆記｜每集提到哪幾檔、講在第幾分鐘`,
  description: site.description,
  alternates: { canonical: abs('/') },
};

export default function Home() {
  const idx = getIndex();

  return (
    <ul className="divide-y divide-[#eee]">
      {idx.episodes.map((e) => (
        <li key={e.slug}>
          <article className="py-6">
            <Link href={`/gooaye/${e.slug}/`} className="block">
              <div className="flex items-center gap-2 text-[13px] text-[#6b6b6b]">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#242424] text-[10px] font-bold text-white">
                  股
                </span>
                <span>股癌</span>
                <span>·</span>
                <time dateTime={e.published_at}>{e.published_at}</time>
              </div>
              <h2 className="mt-2 border-0 p-0 font-sans text-[22px] font-bold leading-snug">
                EP{e.ep_number}｜{e.top_tickers.slice(0, 2).map((t) => t.display_name).join('、') || '本集筆記'}
              </h2>
              <p className="mt-1 line-clamp-2 text-[16px] leading-7 text-[#6b6b6b]">
                {e.summary_answer_first ?? ''}
              </p>
              <p className="mt-2 text-[13px] text-[#6b6b6b]">
                {minutes(e.duration_s)} 分鐘 · 提及 {e.mention_total} 檔
              </p>
            </Link>
            <div className="mt-2">
              <StanceTagRow items={e.top_tickers} max={3} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
