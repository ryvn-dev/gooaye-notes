import Link from 'next/link';
import type { Metadata } from 'next';
import { getIndex, minutes } from '@/lib/content';
import StanceTagRow from '@/components/StanceTagRow';
import { site, abs } from '@/lib/site';

export const metadata: Metadata = {
  title: '股癌筆記',
  description: site.description,
  alternates: { canonical: abs('/') },
  keywords: [...site.keywords],
};

export default function Home() {
  const idx = getIndex();

  return (
    <>
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
              <h2 className="mt-2 border-0 p-0 font-sans text-[20px] font-bold leading-snug">
                {e.feed_title ?? `EP${e.ep_number}`}｜
                {e.top_tickers.slice(0, 2).map((t) => t.display_name).join('、') || '本集筆記'}
              </h2>
              <p className="mt-1 line-clamp-2 text-[15px] leading-7 text-[#6b6b6b]">
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
    <p className="mt-8 text-[13px] leading-7 text-[#6b6b6b]">
      股癌 Podcast 的個人筆記：每一集整理成重點、相關個股與看多看空，附上原話與可跳播的段落，
      點一下就能回到那一段自己聽。
    </p>
    </>
  );
}
