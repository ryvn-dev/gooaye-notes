'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';

export type SearchDoc = {
  kind: 'episode' | 'ticker';
  href: string;
  title: string;
  sub: string;
  keywords: string;
};

export default function SearchClient({ docs }: { docs: SearchDoc[] }) {
  const [q, setQ] = useState('');
  const fuse = useMemo(
    () => new Fuse(docs, { keys: ['title', 'sub', 'keywords'], threshold: 0.35, ignoreLocation: true }),
    [docs],
  );
  const hits = q.trim() ? fuse.search(q.trim()).slice(0, 60).map((r) => r.item) : docs;

  return (
    <div>
      <label htmlFor="q" className="sr-only">
        搜尋集數或個股
      </label>
      <input
        id="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="輸入集號、個股名或代號，例如 輝達、NVDA、EP698"
        className="w-full border border-slate-300 px-4 py-3 text-[17px] outline-none focus:border-slate-500"
      />
      <p className="mt-2 text-sm text-slate-500">
        {q.trim() ? `${hits.length} 筆結果` : `共 ${docs.length} 筆可搜尋（集數與個股）。全文逐字稿不在本站，搜不到內文。`}
      </p>
      <ul className="mt-4 divide-y divide-slate-100">
        {hits.map((d) => (
          <li key={d.href} className="py-3">
            <Link href={d.href} className="font-medium underline underline-offset-2">
              {d.title}
            </Link>
            <p className="text-sm text-slate-500">{d.sub}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
