'use client';

import {
  Bar, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Stance } from '@/lib/content';

export type Point = {
  ep: number;
  date: string;
  count: number | null;
  stance: Stance;
  stanceLabel: string;
  jev: number | null;
};

const FILL: Record<Stance, string> = {
  bullish: '#16a34a',
  bearish: '#dc2626',
  neutral: '#737373',
  mentioned: '#d4d4d8',
};

function TipBox({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border border-slate-300 bg-white px-2 py-1 text-[13px] leading-6">
      <div>
        EP{p.ep} · {p.date}
      </div>
      <div>
        {p.stanceLabel} · 提到 {p.count === null ? '待補' : `${p.count} 次`}
      </div>
      <div>Jev 讀法 {p.jev === null ? '待補' : `${Math.round(p.jev * 100)}%`}</div>
    </div>
  );
}

export default function TickerChart({ data }: { data: Point[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: -24 }}>
          <XAxis dataKey="ep" tickFormatter={(v) => `EP${v}`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="c" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="p" orientation="right" domain={[0, 1]} hide />
          <Tooltip content={<TipBox />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar yAxisId="c" dataKey="count" barSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.ep} fill={FILL[d.stance]} />
            ))}
          </Bar>
          <Line
            yAxisId="p"
            dataKey="jev"
            stroke="none"
            isAnimationActive={false}
            dot={{ r: 3, fill: '#242424' }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
