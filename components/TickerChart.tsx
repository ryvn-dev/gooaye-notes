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
  conf: number | null;
};

import { STANCE_COLOR } from '@/components/StanceIcon';

const FILL: Record<Stance, string> = {
  ...STANCE_COLOR,
  mentioned: '#d9d9d9',
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
        {p.stanceLabel}
        {p.count === null ? '' : ` · 提到 ${p.count} 次`}
      </div>
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
            dataKey="conf"
            stroke="none"
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; payload?: Point }) =>
              props.payload?.conf === null || props.cx === undefined || props.cy === undefined ? (
                <g key={`${props.payload?.ep ?? 'x'}-none`} />
              ) : (
                <circle
                  key={props.payload?.ep}
                  cx={props.cx}
                  cy={props.cy}
                  r={3}
                  fill="#242424"
                  opacity={Math.min(1, Math.max(0.35, props.payload?.conf ?? 1))}
                />
              )
            }
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
