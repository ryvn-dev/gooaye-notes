import Link from 'next/link';
import type { Metadata } from 'next';
import type { PodcastEpisode, BreadcrumbList, WithContext } from 'schema-dts';
import { getIndex, getEpisode, minutes } from '@/lib/content';
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
    return `股癌 EP${ep.ep_number}（${ep.published_at}，${minutes(ep.duration_s)} 分鐘）的重點筆記與播放器。`;
  }
  const top = shown
    .slice(0, 3)
    .map((m) => m.display_name)
    .join('、');
  return `股癌 EP${ep.ep_number}（${ep.published_at}）提到 ${top}，附原話與時間碼，可以直接跳著聽。`;
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

      <nav className="text-[13px] text-[#6b6b6b]">
        <Link href="/" className="underline underline-offset-2">
          {site.name}
        </Link>
      </nav>

      <div className="mt-3">
        <StanceTagRow items={shown} max={4} />
      </div>

      <h1 className="mt-4 leading-tight">股癌 EP{ep.ep_number} 重點筆記</h1>

      <p className="mt-3 text-[18px] leading-8 text-[#6b6b6b]">{answerFirst(ep) ?? ''}</p>

      <p className="mt-4 text-[13px] text-[#6b6b6b]">
        {minutes(ep.duration_s)} 分鐘 · <time dateTime={ep.published_at}>{ep.published_at}</time>
      </p>

      <div className="divider" />

      {ep.summary && (
        <>
          <h2 className="mt-8">摘要</h2>
          <p>{ep.summary}</p>
        </>
      )}

      <AdSlot id="episode-mid" />

      {ep.key_points.length > 0 && (
        <>
          <h2 className="mt-8">重點</h2>
          <ul className="mt-3 space-y-2">
            {ep.key_points.map((k) => (
              <li key={k.text} className="flex gap-2">
                {k.t !== null && <TimecodeButton seconds={k.t} />}
                <span>{k.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {ep.segment_tags.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-1.5">
          {ep.segment_tags.map((t) => (
            <li key={t} className="rounded-full border border-[#e5e5e5] px-2.5 py-0.5 text-[13px]">
              {t}
            </li>
          ))}
        </ul>
      )}

      {shown.length > 0 && (
        <>
          <h2 className="mt-8">相關個股</h2>
          <table className="mt-3 w-full border-collapse text-[16px]">
            <tbody>
              {shown.map((m) => (
                <MentionCard key={m.ticker} m={m} />
              ))}
            </tbody>
          </table>
        </>
      )}

      {ep.transcript_available && ep.transcript && (
        <>
          <h2 className="mt-10">逐字稿</h2>
          <div className="mt-3 space-y-3">
            {ep.transcript.map((seg, i) => (
              <div key={i} className="flex gap-2">
                {seg.t !== null ? <TimecodeButton seconds={seg.t} /> : <span className="w-6 shrink-0" />}
                <p className="m-0 text-[17px] leading-8">{seg.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <nav className="mt-10 flex justify-between gap-4 border-t border-[#eee] pt-4 text-[15px]">
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
        <p className="mt-4 rounded-xl border border-slate-200 p-4 text-slate-500">
          報價／音檔暫時抓不到。
        </p>
      )}
    </>
  );
}
