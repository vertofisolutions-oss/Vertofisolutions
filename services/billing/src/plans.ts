import type { Plan } from "@vertofi/tenancy";

/** Billing cycle for autopay subscriptions. Annual = 2 months free (×10). */
export type BillingCycle = "MONTHLY" | "YEARLY";

/** Plan catalog + limits (docs/01, docs/11). Amounts in INR. */
export interface PlanDef {
  plan: Plan;
  monthly: number;
  /** Annual price = 10× monthly (≈17% off / 2 months free). */
  yearly: number;
  limits: Record<string, number>; // -1 = unlimited
}

/** Annual = 10 months' price (2 months free). Keep in sync with setup-razorpay.ps1. */
const yearlyOf = (monthly: number) => monthly * 10;

export const PLANS: Record<Plan, PlanDef> = {
  STARTER: {
    plan: "STARTER",
    monthly: 699,
    yearly: yearlyOf(699),
    limits: { BUSINESSES: 1, USERS: 2, INVOICES: 1000, OCR_SCANS: 100, STORAGE_GB: 5, BANK_ACCOUNTS: 1, AI_CALLS: 200 },
  },
  GROWTH: {
    plan: "GROWTH",
    monthly: 1999,
    yearly: yearlyOf(1999),
    limits: { BUSINESSES: 5, USERS: 10, INVOICES: 10000, OCR_SCANS: 2000, STORAGE_GB: 50, BANK_ACCOUNTS: 10, AI_CALLS: 5000 },
  },
  PRO: {
    plan: "PRO",
    monthly: 4999,
    yearly: yearlyOf(4999),
    limits: { BUSINESSES: -1, USERS: 50, INVOICES: -1, OCR_SCANS: 25000, STORAGE_GB: 500, BANK_ACCOUNTS: -1, AI_CALLS: 50000 },
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    monthly: 29999,
    yearly: yearlyOf(29999),
    limits: { BUSINESSES: -1, USERS: -1, INVOICES: -1, OCR_SCANS: -1, STORAGE_GB: -1, BANK_ACCOUNTS: -1, AI_CALLS: -1 },
  },
};

/** Price for a plan on a given cycle (INR). */
export function amountFor(plan: Plan, cycle: BillingCycle): number {
  const def = PLANS[plan];
  return cycle === "YEARLY" ? def.yearly : def.monthly;
}

export function limitFor(plan: Plan, metric: string): number {
  return PLANS[plan]?.limits[metric] ?? 0;
}
