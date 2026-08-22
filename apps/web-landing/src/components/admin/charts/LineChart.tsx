"use client";

interface Props {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  label?: string;
}

export default function LineChartComponent({ data, xKey, yKey, color = "#3B82F6", label }: Props) {
  if (!data || data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No chart data</div>;
  }

  const values = data.map((d) => Number(d[yKey]) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 400 + 40;
    const y = 160 - ((Number(d[yKey]) || 0) - min) / range * 120;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full h-[200px] flex flex-col justify-center">
      <svg viewBox="0 0 480 180" className="w-full h-full">
        <defs>
          <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="40" y1="40" x2="440" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="100" x2="440" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
        <line x1="40" y1="160" x2="440" y2="160" stroke="#e2e8f0" />
        <polygon
          points={`40,160 ${points} ${440},160`}
          fill={`url(#grad-${yKey})`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * 400 + 40;
          const y = 160 - ((Number(d[yKey]) || 0) - min) / range * 120;
          return (
            <circle key={i} cx={x} cy={y} r="3" fill={color} />
          );
        })}
      </svg>
    </div>
  );
}
