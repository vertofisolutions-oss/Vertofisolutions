import * as React from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";

export interface HealthScoreCardProps {
  score: number | null; // 0–100, null → not yet computed
  label?: string;
}

/**
 * The iconic Business Health Score (docs/12): huge number, small label,
 * gold rating badge. Renders an empty state when no score yet.
 */
function rating(score: number): { text: string; tone: "gold" | "brand" | "danger" } {
  if (score >= 80) return { text: "Excellent", tone: "gold" };
  if (score >= 60) return { text: "Healthy", tone: "brand" };
  if (score >= 40) return { text: "Needs Attention", tone: "brand" };
  return { text: "At Risk", tone: "danger" };
}

export function HealthScoreCard({ score, label = "Business Health Score" }: HealthScoreCardProps) {
  return (
    <Card interactive className="flex flex-col gap-1">
      {score === null ? (
        <>
          <span className="text-5xl font-bold tracking-tight text-muted">—</span>
          <span className="text-sm text-muted">{label}</span>
          <span className="mt-1 text-xs text-muted">
            Complete onboarding to generate your score.
          </span>
        </>
      ) : (
        <>
          <span className="text-6xl font-bold tracking-tight text-ink">{score}</span>
          <span className="text-sm text-muted">{label}</span>
          <div className="mt-1">
            <Badge tone={rating(score).tone}>{rating(score).text}</Badge>
          </div>
        </>
      )}
    </Card>
  );
}
