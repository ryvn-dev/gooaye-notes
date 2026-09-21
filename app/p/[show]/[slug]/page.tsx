import type { Metadata } from 'next';
import type { PodcastEpisode, BreadcrumbList, WithContext } from 'schema-dts';
import { getIndex, getEpisode, minutes } from '@/lib/content';
import MentionCard from '@/components/MentionCard';
import StanceTagRow from '@/components/StanceTagRow';
import AudioPlayer from '@/components/AudioPlayer';
import TimecodeButton from '@/components/TimecodeButton';
import Transcript from '@/components/Transcript';
import HashFlash from '@/components/HashFlash';
import AdSlot from '@/components/AdSlot';
import { site, abs } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getIndex().episodes.map((e) => ({ show: e.show, slug: e.slug }));
}

/** 重點第 i 點反白到哪一句（給重點那一列做回跳的 anchor）。 */
const findSentence = (ep: ReturnType<typeof getEpisode>, i: number) => {
  const blocks = ep.blocks ?? [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const si = blocks[bi].sentences.findIndex((s) => s.key_point === i);
    if (si !== -1) return `${bi}-${si}`;
  }
  return null;
};

const answerFirst = (ep: ReturnType<typeof getEpisode>) => {
  if (ep.summary_answer_first) return ep.summary_answer_first;
  return null;
};

const metaLine = (ep: ReturnType<typeof getEpisode>) => {
  const shown = ep.mentions.filter((m) => m.publish !== false);
  if (shown.length === 0) {
    return `股癌 EP${ep.ep_number}（${ep.published_at}，${minutes(ep.duration_s)} 分鐘）的重點筆記與播放器。`;
  }
  const top = shown
    .slice(0, 3)
    .map((m) => m.display_name)
    .join('、');
  return `股癌 EP${ep.ep_number}（${ep.published_at}）提到 ${top}，附原話與時間碼，可以直接跳著聽。`;
};

export async function generateMetadata({ params }: { params: Promise<{ show: string; slug: string }> }): Promise<Metadata> {
  const { show, slug } = await params;
  const ep = getEpisode(slug);
  const title = ep.site_title;
  const description = (answerFirst(ep) ?? metaLine(ep)).slice(0, 155);
  const url = abs(`/p/${show}/${slug}/`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: site.name,
      locale: 'zh_TW',
      publishedTime: ep.published_at,
      images: [{ url: abs(`/og/${show}-${slug}.png`), width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [abs(`/og/${show}-${slug}.png`)] },
  };
}

export default async function EpisodePage({ params }: { params: Promise<{ show: string; slug: string }> }) {
  const { show, slug } = await params;
  const ep = getEpisode(slug);
  const shown = ep.mentions.filter((m) => m.publish !== false);

  const episodeLd: WithContext<PodcastEpisode> & { speakable: unknown } = {
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-speakable]'] },
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: ep.site_title,
    episodeNumber: ep.ep_number,
    datePublished: ep.published_at,
    timeRequired: `PT${Math.round(ep.duration_s / 60)}M`,
    url: abs(`/p/${show}/${slug}/`),
    description: answerFirst(ep) ?? metaLine(ep),
    inLanguage: 'zh-Hant-TW',
    partOfSeries: { '@type': 'PodcastSeries', name: ep.show_name ?? '股癌', url: ep.source_url },
    about: shown.map((m) => ({ '@type': 'Corporation' as const, name: m.display_name, tickerSymbol: m.ticker })),

    ...(ep.audio_url ? { associatedMedia: { '@type': 'MediaObject', contentUrl: ep.audio_url } } : {}),
  };

  const crumbLd: WithContext<BreadcrumbList> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.name, item: abs('/') },
      { '@type': 'ListItem', position: 2, name: ep.site_title, item: abs(`/p/${show}/${slug}/`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(episodeLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />

      <HashFlash />

      <div>
        <StanceTagRow items={shown} max={4} />
      </div>

      <h1 className="mt-4 leading-tight">{ep.site_title}</h1>

      <p className="mt-3 text-[16px] leading-7 text-[#6b6b6b]" data-speakable>
        {answerFirst(ep) ?? ''}
      </p>

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
            {ep.key_points.map((k, i) => {
              const back = findSentence(ep, i);
              return (
                <li key={k.text} id={`kp-${i}`} className="flex scroll-mt-16 items-start gap-2">
                  {k.t !== null && <TimecodeButton seconds={k.t} />}
                  {back ? (
                    <a href={`#s-${back}`} className="no-underline">
                      {k.text}
                    </a>
                  ) : (
                    <span>{k.text}</span>
                  )}
                </li>
              );
            })}
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

      <h2 className="mt-10">逐字稿</h2>
      {ep.blocks?.length ? (
        <Transcript
          blocks={ep.blocks}
          names={Object.fromEntries(ep.mentions.map((m) => [m.ticker, m.short_name ?? m.display_name]))}
        />
      ) : (
        <p className="mt-3 text-[15px] text-[#6b6b6b]">逐字稿待補。</p>
      )}

      {shown.length > 0 && (
        <>
          <h2 className="mt-8">相關個股</h2>
          <table className="mt-3 w-full border-collapse text-[16px]">
            <caption className="sr-only">這一集提到的個股、原話與報價連結</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">個股與原話</th>
                <th scope="col">跳到那一段</th>
                <th scope="col">報價</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <MentionCard key={m.ticker} m={m} />
              ))}
            </tbody>
          </table>
        </>
      )}



      {ep.audio_url ? (
        <AudioPlayer src={ep.audio_url} title={ep.feed_title ?? `股癌 EP${ep.ep_number}`} />
      ) : (
        <p className="mt-4 text-[#6b6b6b]">音檔暫時抓不到。</p>
      )}
    </>
  );
}
