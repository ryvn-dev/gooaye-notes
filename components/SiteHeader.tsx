'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { site } from '@/lib/site';

/** 頂部只有 wordmark，往下捲一起收起。 */
export default function SiteHeader() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) > 8) {
        setHidden(y > last && y > 80);
        last = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b border-[#eee] bg-white transition-transform duration-200"
      style={{ transform: hidden ? 'translateY(-100%)' : 'translateY(0)' }}
    >
      <div className="mx-auto max-w-[680px] px-4 py-4">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight">
          {site.name}
        </Link>
      </div>
    </header>
  );
}
