import type { MetadataRoute } from 'next';
import { getIndex, getTickers, tickerSlug } from '@/lib/content';
import { abs } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const idx = getIndex();
  return [
    { url: abs('/'), changeFrequency: 'daily', priority: 1 },
    { url: abs('/ticker/'), changeFrequency: 'daily', priority: 0.8 },
    { url: abs('/search/'), changeFrequency: 'monthly', priority: 0.3 },
    { url: abs('/about/'), changeFrequency: 'monthly', priority: 0.3 },
    ...idx.episodes.map((e) => ({
      url: abs(`/gooaye/${e.slug}/`),
      lastModified: e.published_at,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...getTickers().tickers.map((t) => ({
      url: abs(`/ticker/${tickerSlug(t.ticker)}/`),
      lastModified: t.last_seen,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
