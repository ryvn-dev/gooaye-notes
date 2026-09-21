'use client';

import { useEffect } from 'react';

/**
 * 跳過去之後讓落地的那一行閃一次外框（1 秒淡出），不加任何文字。
 * 重點那一點與逐字稿那一句互跳，跳完要看得出來停在哪一行。
 */
export default function HashFlash() {
  useEffect(() => {
    const flash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('flash-land');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('flash-land');
      window.setTimeout(() => el.classList.remove('flash-land'), 1000);
    };
    flash();
    window.addEventListener('hashchange', flash);
    return () => window.removeEventListener('hashchange', flash);
  }, []);
  return null;
}
