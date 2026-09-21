import type { Stance } from '@/lib/content';

// 全站一律：紅＝看多、綠＝看空（台灣慣例），不分市場。
export const STANCE_COLOR: Record<Stance, string> = {
  bullish: '#C0392B',
  bearish: '#2E7D5B',
  neutral: '#8a8a8a',
  mentioned: 'transparent',
};

const PATH: Record<Stance, string> = {
  bullish: 'M1 11 L5 7 L8 9 L13 3',
  bearish: 'M1 3 L5 7 L8 5 L13 11',
  neutral: '',
  mentioned: '',
};

const LABEL: Record<Stance, string> = {
  bullish: '看多', bearish: '看空', neutral: '沒有方向', mentioned: '提到',
};

export default function StanceIcon({ stance, p }: { stance: Stance; p?: number | null }) {
  // 透明度＝模型對這個讀法的把握，不印數字
  const opacity = p === null || p === undefined ? 1 : Math.min(1, Math.max(0.35, p));
  // 沒有方向（保留、提到、待覆核）一律灰點，不畫箭頭也不留空白。
  if (!PATH[stance]) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label={LABEL[stance]} style={{ opacity }}>
        <circle cx="7" cy="7" r="2.6" fill="#8a8a8a" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" role="img" aria-label={LABEL[stance]} style={{ opacity }}>
      <path d={PATH[stance]} stroke={STANCE_COLOR[stance]} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
