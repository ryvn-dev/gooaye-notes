'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';

export type Bar = { d: string; o: number; h: number; l: number; c: number; v: number };
type Stance = 'bullish' | 'bearish' | 'neutral' | 'mentioned' | 'mixed';

export type Mark = {
  date: string;
  /** 同一集可能兩個方向都講過；只留一個會把 mixed 吃掉。 */
  stances: Stance[];
  show: string;
  /** 之後要做「每個人的成績單」時用得到；現在節目只有一位主講。 */
  speaker?: string | null;
  perf?: { base_date: string; base: number; last_date: string; last: number; pct: number | null; d5: number | null; d21: number | null } | null;
};

const COLOR = { up: '#C0392B', down: '#2E7D5B', flat: '#9a9a9a' };
const LABEL = { bullish: '看多', bearish: '看空', neutral: '保留', mentioned: '提到', mixed: '看多也看空' } as const;

/** 日線 K ＋ 成交量，最近 12 個月；每一次被提到在圖上一個標記。用庫：lightweight-charts。 */
export default function PriceChart({ bars, marks }: { bars: Bar[]; marks: Mark[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; text: string } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || bars.length === 0) return;

    const chart: IChartApi = createChart(el, {
      height: 260,
      layout: { background: { color: '#ffffff' }, textColor: '#9a9a9a', fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: '#f4f4f4' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.28 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: 1, vertLine: { color: '#d4d4d4', width: 1, style: 2, labelVisible: false }, horzLine: { visible: false, labelVisible: false } },
      handleScale: false,
      handleScroll: false,
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: COLOR.up,
      downColor: COLOR.down,
      wickUpColor: COLOR.up,
      wickDownColor: COLOR.down,
      borderVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    candles.setData(bars.map((b) => ({ time: b.d as Time, open: b.o, high: b.h, low: b.l, close: b.c })));

    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '', priceLineVisible: false, lastValueVisible: false });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(bars.map((b) => ({ time: b.d as Time, value: b.v, color: b.c >= b.o ? '#f0d5d1' : '#d6e5de' })));

    const byDate = new Map(bars.map((b) => [b.d, b]));
    // 發布日可能不是交易日（或報價還沒更新到那一天）：往後找最近的交易日，沒有就用最後一根。
    const snap = (d: string) => {
      if (byDate.has(d)) return d;
      if (d < bars[0].d) return null;
      return bars.find((b) => b.d >= d)?.d ?? bars[bars.length - 1].d;
    };

    // 同一天可能有多個節目／多個人講同一檔：合併成一顆 marker，tooltip 再展開（lightweight-charts
    // 不像 Highcharts flags 會自動堆疊，合併規則是我們自己的資料模型）。
    const byDay = new Map<string, Mark[]>();
    for (const m of marks) {
      const d = snap(m.date);
      if (d) byDay.set(d, [...(byDay.get(d) ?? []), m]);
    }
    const markerMap = new Map<string, string[]>();
    const markers: SeriesMarker<Time>[] = [];
    for (const [d, group] of byDay) {
      markerMap.set(
        d,
        group.map((m) => {
          const label = (m.stances.length ? m.stances : (['mentioned'] as Stance[])).map((s) => LABEL[s]).join('、');
          const head = [m.show, m.speaker, m.date, label].filter(Boolean).join(' · ');
          if (!m.perf) return `${head} · 報價暫時抓不到`;
          const p = m.perf;
          const pc = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
          const tail = [`${p.base} → ${p.last} ${pc(p.pct)}`,
            p.d5 !== null ? `5 日 ${pc(p.d5)}` : null,
            p.d21 !== null ? `21 日 ${pc(p.d21)}` : null].filter(Boolean).join(' · ');
          return `${head} · ${tail}`;
        }),
      );
      // 兩個方向都講過（同一集 mixed，或同一天兩個節目講反）：上下各畫一個箭頭，
      // 不要用多數決或 neutral 蓋掉 —— 首頁 chip 是雙向 icon，圖上也要看得出來是雙向。
      const kinds = new Set(group.flatMap((m) => (m.stances.length ? m.stances : (['mentioned'] as Stance[]))));
      const up = kinds.has('bullish') || kinds.has('mixed');
      const down = kinds.has('bearish') || kinds.has('mixed');
      if (up) markers.push({ time: d as Time, position: 'aboveBar', shape: 'arrowUp', color: COLOR.up, size: 1.4 });
      if (down) markers.push({ time: d as Time, position: 'belowBar', shape: 'arrowDown', color: COLOR.down, size: 1.4 });
      if (!up && !down) markers.push({ time: d as Time, position: 'aboveBar', shape: 'circle', color: COLOR.flat });
    }
    // marks 是新到舊，markers 要由舊到新（lightweight-charts 要求遞增）。
    markers.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    createSeriesMarkers(candles, markers);
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      const t = typeof param.time === 'string' ? param.time : null;
      const lines = t ? markerMap.get(t) : null;
      if (!lines || !param.point) setTip(null);
      else setTip({ x: param.point.x, text: lines.join('　') });
    });

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [bars, marks]);

  if (bars.length === 0) return <p className="mt-4 text-[15px] text-[#6b6b6b]">報價暫時抓不到。</p>;

  return (
    <div className="relative mt-4">
      <div ref={box} />
      {tip && (
        <div
          className="pointer-events-none absolute top-0 whitespace-nowrap border border-[#e5e5e5] bg-white px-2 py-1 text-[12px] text-[#242424]"
          style={{ left: Math.max(0, Math.min(tip.x - 90, (box.current?.clientWidth ?? 320) - 220)) }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
