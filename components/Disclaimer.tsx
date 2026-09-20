import Link from 'next/link';

export default function Disclaimer() {
  return (
    <p className="mt-10 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-500">
      本站為非官方的第三方整理，與節目及其製作方沒有任何關係。內容由地端 AI 從公開音檔整理，
      <strong className="font-semibold">可能有錯</strong>，每一列都附時間碼，請自己回去聽原集。
      <strong className="font-semibold">本站不構成投資建議</strong>，也不提供買賣、目標價或進出場價位。
      <Link href="/about/" className="ml-1 underline underline-offset-2">
        完整聲明與下架聯絡
      </Link>
    </p>
  );
}
