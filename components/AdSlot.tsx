// 廣告版位佔位：帳號還沒開，這裡不載入任何第三方程式碼，也沒有任何 key。
// 之後接上時，內容與廣告要視覺上分離，且第一屏不放。
export default function AdSlot({ id }: { id: string }) {
  if (process.env.NEXT_PUBLIC_ADS !== 'on') return null;
  return <div data-ad-slot={id} className="my-8 min-h-[90px] border-y border-slate-200" />;
}
