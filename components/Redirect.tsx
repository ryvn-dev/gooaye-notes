'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** 靜態輸出沒有伺服器轉址，用 client 端 replace。 */
export default function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <p className="text-[15px] text-[#6b6b6b]">
      這一頁換位置了，
      <Link href={to} className="underline underline-offset-2">
        點這裡前往
      </Link>
      。
    </p>
  );
}
