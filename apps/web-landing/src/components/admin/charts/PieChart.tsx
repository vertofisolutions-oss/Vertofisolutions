"use client";

const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4"];

interface Props {
  data: { name: string; value: number }[];
}

export default function PieChartComponent({ data }: Props) {
  if (!data || data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-slate-400">No chart data</div>;
  }

  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0) || 1;
  let accumulatedAngle = 0;

  return (
    <div className="w-full h-[200px] flex items-center justify-around">
      <svg viewBox="0 0 160 160" className="w-36 h-36">
        {data.map((slice, i) => {
          const percentage = (slice.value || 0) / total;
          const startAngle = accumulatedAngle;
          const endAngle = accumulatedAngle + percentage * 2 * Math.PI;
          accumulatedAngle = endAngle;

          const x1 = 80 + 60 * Math.cos(startAngle);
          const y1 = 80 + 60 * Math.sin(startAngle);
          const x2 = 80 + 60 * Math.cos(endAngle);
          const y2 = 80 + 60 * Math.sin(endAngle);
          const largeArc = percentage > 0.5 ? 1 : 0;

          const pathData = percentage >= 0.999
            ? `M 80 20 A 60 60 0 1 1 79.99 20 Z`
            : `M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`;

          return (
            <path
              key={i}
              d={pathData}
              fill={COLORS[i % COLORS.length]}
            />
          );
        })}
        <circle cx="80" cy="80" r="38" fill="white" />
      </svg>

      <div className="flex flex-col gap-1 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-slate-600 font-medium">{d.name}</span>
            <span className="text-slate-400 font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
