'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, List, Search, Info } from 'lucide-react';

const ITEMS = [
  { href: '/', label: '首頁', Icon: Home },
  { href: '/ticker/', label: '個股', Icon: List },
  { href: '/search/', label: '搜尋', Icon: Search },
  { href: '/about/', label: '關於', Icon: Info },
];

/** 底部 icon bar：往下捲收起、往上捲出現。收起時 --nav-h 變 0，audio bar 自己貼底。 */
export default function BottomNav() {
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) > 8) {
        const next = y > last && y > 80;
        setHidden(next);
        document.body.dataset.navHidden = next ? '1' : '0';
        last = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      aria-label="主選單"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#eee] bg-white transition-transform duration-200"
      style={{ transform: hidden ? 'translateY(100%)' : 'translateY(0)' }}
    >
      <ul className="mx-auto flex max-w-[680px]">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                className="flex h-14 flex-col items-center justify-center gap-0.5"
                style={{ color: active ? '#242424' : '#9a9a9a' }}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                <span className="text-[10px]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
