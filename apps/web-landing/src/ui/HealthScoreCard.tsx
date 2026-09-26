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
type Tone = "neutral" | "brand" | "gold" | "danger" | "deep-green" | "green" | "yellow" | "amber" | "orange" | "red";

function rating(score: number): { text: string; tone: Tone } {
  if (score >= 85) return { text: "Excellent", tone: "deep-green" };
  if (score >= 71) return { text: "Healthy", tone: "green" };
  if (score >= 55) return { text: "Moderate", tone: "yellow" };
  if (score >= 40) return { text: "Weak", tone: "amber" };
  if (score >= 20) return { text: "Poor", tone: "orange" };
  return { text: "Critical", tone: "red" };
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
