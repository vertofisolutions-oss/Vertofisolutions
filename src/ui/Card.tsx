"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "./cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Glass-hover lift + blue glow on hover (docs/12 premium effect). */
  interactive?: boolean;
}

/**
 * The platform is card-based: white, 1px #F1F5F9 border, 24px radius,
 * soft shadow. Glass hover = translateY(-2px); glow is blue only.
 */
export function Card({ interactive, className, children, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={interactive ? { y: -2, boxShadow: "0 0 40px rgba(19,120,248,.15)" } : undefined}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-card border border-borderCard bg-white p-6 shadow-card",
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-ink", className)} {...props} />;
}
