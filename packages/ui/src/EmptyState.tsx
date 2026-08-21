import * as React from "react";
import { Card } from "./Card";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  /** Shown when a connector needs credentials (docs/09) — activation CTA. */
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * First-class empty state. Used everywhere real data is not yet available
 * (e.g. a connector reporting NEEDS_CREDENTIALS). NEVER replaced by fake data.
 */
export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && (
        <Button variant="primary" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
