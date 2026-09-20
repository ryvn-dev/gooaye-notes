import Link from 'next/link';
import type { Metadata } from 'next';
import type { PodcastEpisode, BreadcrumbList, WithContext } from 'schema-dts';
import { getIndex, getEpisode, mmss, minutes } from '@/lib/content';
import MentionCard from '@/components/MentionCard';
import StanceTagRow from '@/components/StanceTagRow';
import AudioPlayer from '@/components/AudioPlayer';
import TimecodeButton from '@/components/TimecodeButton';
import AdSlot from '@/components/AdSlot';
import Disclaimer from '@/components/Disclaimer';
import { site, abs } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getIndex().episodes.map((e) => ({ slug: e.slug }));
}

const answerFirst = (ep: ReturnType<typeof getEpisode>) => {
  if (ep.summary_answer_first) return ep.summary_answer_first;
  return null;
};

const metaLine = (ep: ReturnType<typeof getEpisode>) => {
  const shown = ep.mentions.filter((m) => !m.needs_review);
  if (shown.length === 0) {
    return `股癌 EP${ep.ep_number} 於 ${ep.published_at} 發布，全長 ${minutes(ep.duration_s)} 分鐘。本集的自動抽取沒有抓到任何個股代號，因此本頁只有音檔與集數資訊。`;
  }
  const top = shown
    .slice(0, 3)
    .map((m) => `${m.display_name}（${m.mention_count} 次，第一次在 ${mmss(m.first_ts_s)}）`)
    .join('、');
  return `股癌 EP${ep.ep_number} 於 ${ep.published_at} 發布，全長 ${minutes(ep.duration_s)} 分鐘，自動抽取到 ${shown.length} 檔個股：提到最多次的是 ${top}。下表列出每一檔的提及次數與時間碼，點時間碼可以跳到那一段自己聽。`;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ep = getEpisode(slug);
  const top = ep.mentions.filter((m) => !m.needs_review).slice(0, 3).map((m) => m.display_name);
  const title = top.length
    ? `股癌 EP${ep.ep_number} 重點筆記｜提到 ${top.join('、')}`
    : `股癌 EP${ep.ep_number} 重點筆記`;
  const description = (answerFirst(ep) ?? metaLine(ep)).slice(0, 155);
  const url = abs(`/gooaye/${slug}/`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title, description, siteName: site.name, locale: 'zh_TW', publishedTime: ep.published_at },
    twitter: { card: 'summary', title, description },
  };
}

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ep = getEpisode(slug);
  const list = getIndex().episodes;
  const i = list.findIndex((e) => e.slug === slug);
  const newer = i > 0 ? list[i - 1] : null;
  const older = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  const shown = ep.mentions.filter((m) => !m.needs_review);
  const review = ep.mentions.filter((m) => m.needs_review);

  const episodeLd: WithContext<PodcastEpisode> = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: `股癌 EP${ep.ep_number}`,
    episodeNumber: ep.ep_number,
    datePublished: ep.published_at,
    timeRequired: `PT${Math.round(ep.duration_s / 60)}M`,
    url: abs(`/gooaye/${slug}/`),
    description: answerFirst(ep) ?? metaLine(ep),
    partOfSeries: { '@type': 'PodcastSeries', name: '股癌', url: ep.source_url },
    ...(ep.audio_url ? { associatedMedia: { '@type': 'MediaObject', contentUrl: ep.audio_url } } : {}),
  };

  const crumbLd: WithContext<BreadcrumbList> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.name, item: abs('/') },
      { '@type': 'ListItem', position: 2, name: `股癌 EP${ep.ep_number}`, item: abs(`/gooaye/${slug}/`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(episodeLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />

      <nav className="text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="underline underline-offset-2">
          {site.name}
        </Link>
        <span className="mx-1">/</span>
        <span>股癌 EP{ep.ep_number}</span>
      </nav>

      <div className="mt-3">
        <StanceTagRow items={shown} />
      </div>

      <h1 className="mt-4 leading-tight">股癌 EP{ep.ep_number} 重點筆記</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {ep.ep_inferred ? '集號為推定' : ''}
      </p>

      <p className="mt-3 text-[20px] text-[#6b6b6b] dark:text-[#a3a3a3]">{answerFirst(ep) ?? '一句摘要待補'}</p>

      <p className="mt-4 text-sm text-[#6b6b6b] dark:text-[#a3a3a3]">
        {minutes(ep.duration_s)} 分鐘 · <time dateTime={ep.published_at}>{ep.published_at}</time> · 主持人
      </p>

      <div className="divider" />


      <AdSlot id="episode-mid" />

      <h2 className="mt-8 text-lg font-bold">AI 摘要</h2>
      {ep.summary ? (
        <p className="mt-2">{ep.summary}</p>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          AI 摘要待補。
        </p>
      )}

      <div className="divider" />
      <h2 className="mt-8 text-lg font-bold">AI 重點整理</h2>
      {ep.key_points.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {ep.key_points.map((k) => (
            <li key={k.text} className="flex gap-2">
              {k.t !== null && <TimecodeButton seconds={k.t} label={mmss(k.t)} />}
              <span>{k.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-slate-500 dark:text-slate-400">重點整理待補。</p>
      )}

      <h2 className="mt-8 text-lg font-bold">重點段標籤</h2>
      {ep.segment_tags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {ep.segment_tags.map((t) => (
            <li key={t} className="rounded-full bg-slate-100 px-3 py-1 text-[15px] dark:bg-slate-800">
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-slate-500 dark:text-slate-400">段落標籤待補。</p>
      )}

      <div className="divider" />
      <h2 className="mt-8 text-lg font-bold">本集提到的個股</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        [observed] 次數與時間碼由自動轉寫抽出。缺值一律顯示「待補」，不填估計值。
      </p>

      {shown.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
          {shown.map((m) => (
            <MentionCard key={m.ticker} m={m} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-slate-500 dark:text-slate-400">本集沒有抽到任何個股代號。</p>
      )}

      {review.length > 0 && (
        <details className="mt-6 border-y border-slate-200 py-4 dark:border-slate-800">
          <summary className="cursor-pointer font-medium">
            待人工確認：{review.length} 個可能是誤抓的代號
          </summary>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            抽取器已知會把一般英文詞當成代號。以下這幾個還沒有人確認過，
            <strong>不會進個股頁</strong>，也不列入任何統計。
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {review.map((m) => (
              <li
                key={m.ticker}
                className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-sm dark:bg-slate-800"
              >
                {m.ticker} · {mmss(m.first_ts_s)}
              </li>
            ))}
          </ul>
        </details>
      )}

      <h2 className="mt-8 text-lg font-bold">全文逐字稿</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">逐字稿為 AI 轉錄，可能有錯。</p>
      {ep.transcript_available && ep.transcript ? (
        <details className="mt-2 border-y border-slate-200 py-4 dark:border-slate-800">
          <summary className="cursor-pointer font-medium">展開全文（{ep.transcript.length} 段）</summary>
          <div className="mt-3 space-y-3">
            {ep.transcript.map((seg) => (
              <div key={seg.t} className="flex gap-2">
                <TimecodeButton seconds={seg.t} label={mmss(seg.t)} />
                <p className="text-[15px] leading-relaxed">{seg.text}</p>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">全文待補。</p>
      )}

      <nav className="mt-8 flex justify-between gap-4 border-t border-slate-200 pt-4 text-[15px] dark:border-slate-800">
        {older ? (
          <Link href={`/gooaye/${older.slug}/`} className="underline underline-offset-2">
            ← EP{older.ep_number}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link href={`/gooaye/${newer.slug}/`} className="underline underline-offset-2">
            EP{newer.ep_number} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <Disclaimer />

      <div className="h-24 md:h-0" />
      {ep.audio_url ? (
        <AudioPlayer src={ep.audio_url} title={`股癌 EP${ep.ep_number}`} />
      ) : (
        <p className="mt-4 rounded-xl border border-slate-200 p-4 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          報價／音檔暫時抓不到。
        </p>
      )}
    </>
  );
}
