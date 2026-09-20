'use client';

export default function TimecodeButton({ seconds, label }: { seconds: number; label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('gooaye:seek', { detail: seconds }))}
      className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[15px] tabular-nums text-slate-700 underline-offset-2 hover:underline dark:bg-slate-800 dark:text-slate-200"
      aria-label={`跳到 ${label}`}
    >
      {label}
    </button>
  );
}
