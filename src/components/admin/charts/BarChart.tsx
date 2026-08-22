"use client";

interface Props {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  label?: string;
}

export default function BarChartComponent({ data, xKey, yKey, color = "#3B82F6", label }: Props) {
  if (!data || data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No chart data</div>;
  }

  const values = data.map((d) => Number(d[yKey]) || 0);
  const max = Math.max(...values, 1);

  return (
    <div className="w-full h-[200px] flex flex-col justify-center">
      <svg viewBox="0 0 480 180" className="w-full h-full">
        <line x1="40" y1="40" x2="440" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="440" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="160" x2="440" y2="160" stroke="#e2e8f0" />
        {data.map((d, i) => {
          const val = Number(d[yKey]) || 0;
          const barHeight = (val / max) * 110;
          const barWidth = Math.min(32, 360 / data.length);
          const x = 50 + i * (380 / data.length);
          const y = 160 - barHeight;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={color}
              />
              <text
                x={x + barWidth / 2}
                y="174"
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
              >
                {String(d[xKey] ?? "")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
