'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

export const AUDIO_ID = 'ep-audio';

/** 頂欄那一列：圓形播放鍵 + 集名 + 細進度條。時間碼按鈕用 window event 呼叫它。 */
export default function AudioPlayer({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    document.body.dataset.player = '1';
    return () => {
      delete document.body.dataset.player;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onJump = (e: Event) => {
      el.currentTime = (e as CustomEvent<number>).detail;
      void el.play().catch(() => {});
    };
    const onTime = () => setPos(el.duration ? el.currentTime / el.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    window.addEventListener('gooaye:seek', onJump);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      window.removeEventListener('gooaye:seek', onJump);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const seekTo = (clientX: number, r: DOMRect) => {
    const el = ref.current;
    if (!el || !el.duration) return;
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    el.currentTime = ratio * el.duration;
    setPos(ratio);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const r = bar.getBoundingClientRect();
    bar.setPointerCapture(e.pointerId);
    seekTo(e.clientX, r);
    const move = (ev: PointerEvent) => seekTo(ev.clientX, r);
    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-12 border-b border-[#e5e5e5] bg-white">
      <div className="mx-auto flex h-full max-w-[680px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? '暫停' : '播放'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#242424] text-white"
        >
          {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <span className="max-w-[40%] overflow-hidden text-ellipsis whitespace-nowrap text-[14px] text-[#242424]">
          {title}
        </span>
        <div
          className="h-[2px] flex-1 cursor-pointer touch-none bg-[#ececec]"
          onPointerDown={onPointerDown}
          role="slider"
          aria-label="播放進度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos * 100)}
          tabIndex={0}
        >
          <div className="h-[2px] bg-[#242424]" style={{ width: `${Math.min(100, pos * 100)}%` }} />
        </div>
      </div>
      <audio id={AUDIO_ID} ref={ref} src={src} preload="none" className="hidden" aria-label={title} />
    </div>
  );
}
