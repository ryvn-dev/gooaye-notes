'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse, { type FuseResultMatch } from 'fuse.js';

export type SearchDoc = {
  kind: 'episode' | 'ticker' | 'paragraph';
  href: string;
  title: string;
  sub: string;
  text: string;
};

const YELLOW = 'bg-[#fff3b0]';

/** 命中那一段的前後文：只截命中的那一句附近，讓人看得出為什麼這一段被搜到。 */
const cut = (text: string, m?: FuseResultMatch) => {
  const span = m?.indices?.length
    ? m.indices.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a))
    : null;
  if (!span) {
    const head = text.slice(0, 80);
    return { before: head, hit: '', after: text.length > 80 ? '…' : '' };
  }
  const start = Math.max(0, span[0] - 24);
  const end = Math.min(text.length, span[1] + 1 + 40);
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, span[0]),
    hit: text.slice(span[0], span[1] + 1),
    after: text.slice(span[1] + 1, end) + (end < text.length ? '…' : ''),
  };
};

export default function SearchClient({ docs, browse }: { docs: SearchDoc[]; browse: number }) {
  const [q, setQ] = useState('');
  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'text', weight: 1 },
          { name: 'sub', weight: 1 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
        includeMatches: true,
      }),
    [docs],
  );

  // 搜尋字串進網址：分享得出去，回上一頁也還在。
  // 靜態輸出不能用 useSearchParams（會要求 Suspense 並退回 CSR），所以直接讀 location。
  useEffect(() => {
    const read = () => setQ(new URLSearchParams(window.location.search).get('q') ?? '');
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  useEffect(() => {
    const u = new URL(window.location.href);
    const now = u.searchParams.get('q') ?? '';
    if (now === q) return;
    if (q) u.searchParams.set('q', q);
    else u.searchParams.delete('q');
    window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`);
  }, [q]);

  const term = q.trim();
  const hits = term
    ? fuse.search(term).slice(0, 60)
    : docs.slice(0, browse).map((item) => ({ item, matches: undefined }));

  return (
    <div>
      <label htmlFor="q" className="sr-only">
        搜尋集數、個股或逐字稿
      </label>
      <input
        id="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="輸入集號、公司名、代號，或節目裡的一句話"
        className="w-full border border-[#d4d4d4] px-4 py-3 text-[17px] outline-none focus:border-[#767676]"
      />
      <p className="mt-2 text-[13px] text-[#6b6b6b]">
        {term
          ? `${hits.length} 筆結果`
          : `共 ${docs.length} 筆可搜尋：集數、個股，以及逐字稿的每一段。`}
      </p>
      <ul className="mt-4 divide-y divide-[#eee]">
        {hits.map((r, i) => {
          const d = r.item;
          const m = (r.matches as readonly FuseResultMatch[] | undefined)?.find((x) => x.key === 'text');
          const s = d.kind === 'paragraph' ? cut(d.text, m) : null;
          return (
            <li key={`${d.href}-${i}`} className="py-3">
              <Link href={d.href} className="font-bold text-[#242424] no-underline">
                {d.title}
              </Link>
              <p className="mt-0.5 text-[13px] text-[#6b6b6b]">{d.sub}</p>
              {s && (
                <p className="mt-1 text-[14px] leading-7 text-[#333]">
                  {s.before}
                  {s.hit && <mark className={`${YELLOW} text-[#242424]`}>{s.hit}</mark>}
                  {s.after}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {term && hits.length === 0 && (
        <p className="mt-4 text-[15px] text-[#6b6b6b]">沒有找到。站上目前只有收錄範圍內的集數。</p>
      )}
    </div>
  );
}
