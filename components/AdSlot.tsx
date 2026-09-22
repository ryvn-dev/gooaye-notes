import { site } from '@/lib/site';

// 廣告版位佔位：開關是 lib/site.ts 的 `ads`（2026-09-23 01:39 拍：先不放）。
// 關著的時候整個版位不畫，也不載入任何第三方程式碼、沒有任何 key。
// 之後接上時，內容與廣告要視覺上分離，且第一屏不放。
export default function AdSlot({ id }: { id: string }) {
  if (!site.ads) return null;
  return <div data-ad-slot={id} className="my-8 min-h-[90px] border-y border-slate-200" />;
}
