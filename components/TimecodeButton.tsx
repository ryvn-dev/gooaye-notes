'use client';

import { Play } from 'lucide-react';

/** 只有一個 ▶，不印秒數。 */
export default function TimecodeButton({
  seconds,
  label,
  big,
}: {
  seconds: number;
  label?: string;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('gooaye:seek', { detail: seconds }))}
      aria-label={label ? `播放 ${label}` : '從這裡播放'}
      className={
        big
          ? // 可點區 44×44，靠負 margin 把行高拉回來（inline-block 的行框算的是 margin box）
            'relative -my-3 -ml-3 mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center align-middle leading-none text-[#767676] transition-colors hover:text-[#242424]'
          : 'relative inline-flex h-[1.9em] w-5 shrink-0 items-center justify-center self-start align-middle leading-none text-[#767676] transition-colors hover:text-[#242424]'
      }
    >
      <Play size={14} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
