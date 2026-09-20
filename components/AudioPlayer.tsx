'use client';

import { useEffect, useRef } from 'react';

export const AUDIO_ID = 'ep-audio';

/** 手機固定在畫面底部，桌機回到內文流裡。時間碼按鈕用 window event 呼叫它。 */
export default function AudioPlayer({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onJump = (e: Event) => {
      el.currentTime = (e as CustomEvent<number>).detail;
      void el.play().catch(() => {});
    };
    window.addEventListener('gooaye:seek', onJump);
    return () => window.removeEventListener('gooaye:seek', onJump);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2 backdrop-blur md:static md:border md:bg-white dark:border-slate-800 dark:bg-slate-950/95 md:dark:bg-slate-900">
      <div className="mx-auto max-w-[680px]">
        <audio id={AUDIO_ID} ref={ref} src={src} controls preload="none" className="w-full" aria-label={title} />
        <p className="mt-2 hidden text-sm text-slate-500 md:block dark:text-slate-400">
          音檔直接取自節目公開 RSS，版權屬原節目所有。點時間碼可以跳到那一段。
        </p>
      </div>
    </div>
  );
}
