import Link from 'next/link';

export default function Disclaimer() {
  return (
    <p className="mt-10 border-t border-[#eee] pt-4 text-sm leading-relaxed text-[#6b6b6b]">
      地端 AI 模型與站主自我判斷，仍有可能出錯。非投資建議。
      <Link href="/about/" className="ml-1 underline underline-offset-2">
        完整聲明與下架聯絡
      </Link>
    </p>
  );
}
