import { getIndex } from '@/lib/content';
import Redirect from '@/components/Redirect';

export const dynamicParams = false;

export function generateStaticParams() {
  return getIndex().episodes.map((e) => ({ slug: e.slug }));
}

export const metadata = { robots: { index: false, follow: true } };

/** 舊網址 /gooaye/<集號>/：保留成轉址頁，sitemap 只列新的 /p/<節目>/<集號>/。 */
export default async function LegacyEpisode({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = getIndex().episodes.find((x) => x.slug === slug);
  return <Redirect to={`/p/${e?.show ?? 'gooaye'}/${slug}/`} />;
}
