"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface WizardStepProps {
  /** Step key, also used as the AnimatePresence key. */
  stepKey: string;
  /** +1 when moving forward, -1 when moving back — drives slide direction. */
  direction?: number;
  children: React.ReactNode;
}

/**
 * Animated step container: slides+fades the active step in/out (240ms ease-out,
 * no bounce, per the Vertofi motion spec). The parent owns step state; this only
 * handles the transition for whatever child is mounted under `stepKey`.
 */
export function WizardStep({ stepKey, direction = 1, children }: WizardStepProps) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Small hook to manage current step + slide direction together. */
export function useWizard(initial = 0) {
  const [step, setStep] = React.useState(initial);
  const [direction, setDirection] = React.useState(1);
  const next = React.useCallback(() => {
    setDirection(1);
    setStep((s) => s + 1);
  }, []);
  const back = React.useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }, []);
  const goTo = React.useCallback((target: number) => {
    setStep((s) => {
      setDirection(target >= s ? 1 : -1);
      return target;
    });
  }, []);
  return { step, direction, next, back, goTo };
}
