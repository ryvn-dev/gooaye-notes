'use client';

/** 段首的小圓點：點了從這一段開始播。除了它，段落裡不放任何標記。 */
export default function SeekDot({ seconds }: { seconds: number }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('gooaye:seek', { detail: seconds }))}
      aria-label="從這裡播放"
      className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full bg-[#cfcfcf] align-[0.35em] transition-colors hover:bg-[#767676]"
    />
  );
}
