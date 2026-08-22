"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface Props {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  label?: string;
}

export default function LineChartComponent({ data, xKey, yKey, color = "#3B82F6", label }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString(), label ?? yKey]}
          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
        />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#grad-${yKey})`}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

