'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Stance } from '@/lib/content';

export type Tip = { code: string; name?: string | null; stance: Stance; p: number | null };

// 兩種螢光筆：個股句淡黃、重點句淡藍；兩者都是的那一句黃底加一條藍色下緣線。
const YELLOW = 'bg-[#fff3b0]';
const BLUE = 'bg-[#dbeafe]';
const BOTH = 'bg-[#fff3b0] border-b-2 border-[#93c5fd]';

const COLOR: Record<Stance, string> = {
  bullish: '#ff7a6b',
  bearish: '#5fc99a',
  neutral: '#b3b3b3',
  mentioned: '#b3b3b3',
  mixed: '#b3b3b3',
};

const LABEL: Record<Stance, string> = {
  bullish: '看多',
  bearish: '看空',
  neutral: '保留',
  mentioned: '提到',
  mixed: '看多也看空',
};

function Arrow({ stance, p }: { stance: Stance; p: number | null }) {
  const c = COLOR[stance];
  const opacity = p === null ? 1 : Math.min(1, Math.max(0.5, p));
  if (stance === 'mixed') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" role="img" aria-label={LABEL.mixed} style={{ opacity }}>
        <path d="M1.5 8 L4.5 5 L6.5 7" stroke="#ff7a6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 5.5 L7.5 7.5 L10.5 4.5" stroke="#5fc99a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (stance === 'mentioned' || stance === 'neutral') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" role="img" aria-label={LABEL[stance]} style={{ opacity }}>
        <circle cx="6" cy="6" r="2.4" fill={c} />
      </svg>
    );
  }
  const d = stance === 'bullish' ? 'M6 10 L6 2 M2.6 5.4 L6 2 L9.4 5.4' : 'M6 2 L6 10 M2.6 6.6 L6 10 L9.4 6.6';
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" role="img" aria-label={LABEL[stance]} style={{ opacity }}>
      <path d={d} stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 螢光筆句子。點一下（或 hover）開 tooltip，再點一下或點別處關；
 * tooltip 錨在這一句的第一行、置中在它正上方，一檔一列「代碼 簡稱 箭頭」，深灰底白字。
 * 只有重點沒有個股的句子不開 tooltip —— 點下去直接跳回上面那一點，省一步。
 */
export default function MarkedSentence({
  id,
  text,
  tips,
  kp = null,
}: {
  id: string;
  text: string;
  tips: Tip[];
  kp?: number | null;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const open = hover || pinned;

  // tooltip 掛在 body 上：逐字稿每一節有 content-visibility，contain 會讓 fixed 改以那一節為基準。
  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const el = ref.current;
    const tip = tipRef.current;
    if (!el || !tip) return;
    const line = el.getClientRects()[0];
    if (!line) return;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.min(Math.max(line.left + line.width / 2 - w / 2, 8), window.innerWidth - w - 8);
    const above = line.top - h - 8;
    setPos({ left, top: above > 56 ? above : line.bottom + 8 });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setPinned(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPinned(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  if (!tips.length) {
    if (kp === null) {
      return (
        <span id={id} className={`scroll-mt-20 ${YELLOW}`}>
          {text}
        </span>
      );
    }
    // 用 span 不用 a：整句在內文裡的連結會被判成「只靠顏色區分」，
    // 而這裡的區分本來就是整句的底色，不是文字顏色。
    const back = () => {
      window.location.hash = `kp-${kp}`;
    };
    return (
      <span
        id={id}
        role="button"
        tabIndex={0}
        data-kp={kp}
        aria-label={`回到重點第 ${kp + 1} 點`}
        className={`scroll-mt-20 cursor-pointer ${BLUE}`}
        onClick={back}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            back();
          }
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      id={id}
      tabIndex={0}
      role="button"
      aria-expanded={open}
      data-tickers={tips.map((t) => t.code).join(',')}
      className={`scroll-mt-20 cursor-pointer ${kp === null ? YELLOW : BOTH}`}
      onClick={() => setPinned((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setPinned((v) => !v);
        }
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
      onBlur={() => setPinned(false)}
    >
      {text}
      {mounted &&
        createPortal(
          <span
            ref={tipRef}
            aria-hidden={!open}
            className="fixed z-40 flex flex-col items-start gap-1 rounded-md bg-[#222] px-2.5 py-1.5 text-[13px] leading-[1.6] font-normal whitespace-nowrap text-white shadow-sm"
            style={{
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              visibility: open && pos ? 'visible' : 'hidden',
              pointerEvents: pinned ? 'auto' : 'none',
            }}
          >
            {tips.map((t) => (
              <span key={t.code} className="inline-flex items-center gap-1">
                <span className="font-mono">{t.code}</span>
                {t.name && t.name !== t.code && <span>{t.name}</span>}
                <Arrow stance={t.stance} p={t.p} />
              </span>
            ))}
            {kp !== null && (
              <a
                href={`#kp-${kp}`}
                className="text-[#cfcfcf] no-underline"
                onClick={() => setPinned(false)}
              >
                ↑ 回到重點
              </a>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}
