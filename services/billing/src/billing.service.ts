import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PgService } from "@vertofi/nest-common";
import type { Plan } from "@vertofi/tenancy";
import { type BillingCycle, PLANS, amountFor, limitFor } from "./plans.js";
import { RazorpayConnector } from "./razorpay.connector.js";

/** Billing/tax details collected before checkout (for GST invoices + RBI notices). */
export interface BillingProfile {
  legalName?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly pg: PgService,
    private readonly razorpay: RazorpayConnector,
  ) {}

  /** Start a 7-day trial subscription row for a new org (docs/01 free trial). */
  async startTrial(orgId: string, plan: Plan = "STARTER"): Promise<void> {
    await this.pg.query(
      `INSERT INTO billing.subscriptions (org_id, plan, status, trial_ends_at)
       VALUES ($1,$2,'TRIAL', now() + interval '7 days')
       ON CONFLICT (org_id) DO NOTHING`,
      [orgId, plan],
    );
  }

  /** Create a checkout order for a paid plan. Requires the Razorpay connector. */
  async checkout(orgId: string, plan: Plan): Promise<{ orderId: string; amount: number; keyId: string }> {
    if (this.razorpay.status() !== "ACTIVE") {
      throw new ServiceUnavailableException({ code: "payments_not_configured", status: this.razorpay.status() });
    }
    const amount = PLANS[plan].monthly;
    const order = await this.razorpay.createOrder(amount, `sub_${orgId}_${Date.now()}`);
    await this.pg.query(
      `INSERT INTO billing.subscriptions (org_id, plan, amount, status, gateway_ref)
       VALUES ($1,$2,$3,'PENDING',$4)
       ON CONFLICT (org_id) DO UPDATE SET plan=EXCLUDED.plan, amount=EXCLUDED.amount, status='PENDING', gateway_ref=EXCLUDED.gateway_ref, updated_at=now()`,
      [orgId, plan, amount, order.id],
    );
    return { orderId: order.id, amount: order.amount, keyId: process.env.RAZORPAY_KEY_ID ?? "" };
  }

  /** Persist the org's billing/tax profile (GST invoices + RBI debit notices). */
  async saveBillingProfile(orgId: string, p: BillingProfile): Promise<void> {
    await this.pg.query(
      `INSERT INTO billing.billing_profiles
         (org_id, legal_name, gstin, email, phone, address_line, city, state, pincode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (org_id) DO UPDATE SET
         legal_name=COALESCE(EXCLUDED.legal_name, billing.billing_profiles.legal_name),
         gstin=COALESCE(EXCLUDED.gstin, billing.billing_profiles.gstin),
         email=COALESCE(EXCLUDED.email, billing.billing_profiles.email),
         phone=COALESCE(EXCLUDED.phone, billing.billing_profiles.phone),
         address_line=COALESCE(EXCLUDED.address_line, billing.billing_profiles.address_line),
         city=COALESCE(EXCLUDED.city, billing.billing_profiles.city),
         state=COALESCE(EXCLUDED.state, billing.billing_profiles.state),
         pincode=COALESCE(EXCLUDED.pincode, billing.billing_profiles.pincode),
         updated_at=now()`,
      [orgId, p.legalName, p.gstin, p.email, p.phone, p.addressLine, p.city, p.state, p.pincode],
    );
  }

  /**
   * Start a subscription with autopay (UPI/card mandate) + a 7-day trial, on a
   * MONTHLY or YEARLY cycle. The customer authorizes the mandate via the returned
   * short_url / Checkout. After the trial, Razorpay auto-charges; on success →
   * ACTIVE, on failure → PAST_DUE (account + data retained, features gated).
   * (docs/04, user requirement.)
   */
  async subscribe(
    orgId: string,
    plan: Plan,
    cycle: BillingCycle = "MONTHLY",
    profile?: BillingProfile,
  ): Promise<{ subscriptionId: string; shortUrl: string; keyId: string; trialDays: number; cycle: BillingCycle; amount: number }> {
    if (this.razorpay.status() !== "ACTIVE") {
      throw new ServiceUnavailableException({ code: "payments_not_configured", status: this.razorpay.status() });
    }
    if (profile) await this.saveBillingProfile(orgId, profile);
    const sub = await this.razorpay.createSubscription(plan, orgId, cycle, 7, { email: profile?.email, phone: profile?.phone });
    const amount = amountFor(plan, cycle);
    await this.pg.query(
      `INSERT INTO billing.subscriptions
         (org_id, plan, period, amount, status, trial_ends_at, razorpay_subscription_id, mandate_status, next_charge_at)
       VALUES ($1,$2,$3,$4,'TRIAL', now() + interval '7 days', $5, 'CREATED', now() + interval '7 days')
       ON CONFLICT (org_id) DO UPDATE
         SET plan=EXCLUDED.plan, period=EXCLUDED.period, amount=EXCLUDED.amount, status='TRIAL',
             trial_ends_at=EXCLUDED.trial_ends_at, razorpay_subscription_id=EXCLUDED.razorpay_subscription_id,
             mandate_status='CREATED', next_charge_at=EXCLUDED.next_charge_at, updated_at=now()`,
      [orgId, plan, cycle, amount, sub.id],
    );
    return { subscriptionId: sub.id, shortUrl: sub.short_url, keyId: this.razorpay.keyId(), trialDays: 7, cycle, amount };
  }

  /** Handle verified Razorpay subscription.* webhooks → drive the trial/autopay state machine. */
  async handleSubscriptionEvent(event: string, subEntity: { id?: string; status?: string; notes?: { org_id?: string } }): Promise<void> {
    const subId = subEntity.id;
    const orgId = subEntity.notes?.org_id;
    if (!subId && !orgId) return;
    const where = subId ? "razorpay_subscription_id=$1" : "org_id=$1";
    const key = subId ?? orgId!;

    if (event === "subscription.authenticated") {
      // Mandate authorized; trial is live with all features.
      await this.pg.query(`UPDATE billing.subscriptions SET mandate_status='AUTHENTICATED', updated_at=now() WHERE ${where}`, [key]);
    } else if (event === "subscription.charged") {
      // Post-trial autopay succeeded → keep the account ACTIVE for another cycle.
      // The renewal window matches the chosen cycle (YEARLY → +1 year, else +1 month).
      await this.pg.query(
        `UPDATE billing.subscriptions SET status='ACTIVE', mandate_status='ACTIVE',
           current_period_end = now() + (CASE WHEN period='YEARLY' THEN interval '1 year' ELSE interval '1 month' END),
           next_charge_at     = now() + (CASE WHEN period='YEARLY' THEN interval '1 year' ELSE interval '1 month' END),
           updated_at=now()
         WHERE ${where}`,
        [key],
      );
    } else if (event === "subscription.halted" || event === "subscription.pending") {
      // Autopay failed → lock features but RETAIN the account + data.
      await this.pg.query(`UPDATE billing.subscriptions SET status='PAST_DUE', mandate_status='HALTED', updated_at=now() WHERE ${where}`, [key]);
    } else if (event === "subscription.cancelled") {
      await this.pg.query(`UPDATE billing.subscriptions SET status='CANCELLED', mandate_status='CANCELLED', updated_at=now() WHERE ${where}`, [key]);
    }
  }

  /** Handle a verified payment.captured webhook → activate the subscription. */
  async activateFromPayment(orgId: string, gatewayRef: string, amount: number, raw: unknown): Promise<void> {
    await this.pg.transaction(async (client) => {
      await client.query(
        `INSERT INTO billing.payments (org_id, gateway_ref, amount, status, raw)
         VALUES ($1,$2,$3,'CAPTURED',$4)`,
        [orgId, gatewayRef, amount, JSON.stringify(raw)],
      );
      await client.query(
        `UPDATE billing.subscriptions
           SET status='ACTIVE', current_period_end = now() + interval '1 month', updated_at=now()
         WHERE org_id=$1`,
        [orgId],
      );
      // emits subscription.activated via outbox (relay in main) → tenant sets org plan_status
    });
  }

  /**
   * The "after payment only" gate (user requirement): an org may use the app
   * only while its subscription is TRIAL (not expired) or ACTIVE.
   */
  async access(orgId: string): Promise<{ active: boolean; plan: Plan | null; status: string | null }> {
    const rows = await this.pg.query<{ plan: Plan; status: string; trial_ends_at: string | null }>(
      "SELECT plan, status, trial_ends_at FROM billing.subscriptions WHERE org_id=$1",
      [orgId],
    );
    const sub = rows[0];
    if (!sub) return { active: false, plan: null, status: null };
    const trialValid = sub.status === "TRIAL" && (!sub.trial_ends_at || new Date(sub.trial_ends_at) > new Date());
    const active = sub.status === "ACTIVE" || trialValid;
    return { active, plan: sub.plan, status: sub.status };
  }

  /** Atomic plan-limit enforcement (docs/19). Returns false when over limit. */
  async consume(orgId: string, metric: string, amount = 1): Promise<{ allowed: boolean; used: number; limit: number }> {
    const sub = await this.access(orgId);
    const plan = sub.plan ?? "STARTER";
    const limit = limitFor(plan, metric);
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (limit === -1) {
      await this.bump(orgId, metric, period, amount, -1);
      return { allowed: true, used: 0, limit: -1 };
    }
    const rows = await this.pg.query<{ used: string }>(
      `INSERT INTO billing.usage_counters (org_id, metric, period, used, limit_v)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (org_id, metric, period)
         DO UPDATE SET used = billing.usage_counters.used + $4
       RETURNING used`,
      [orgId, metric, period, amount, limit],
    );
    const used = Number(rows[0]!.used);
    return { allowed: used <= limit, used, limit };
  }

  private async bump(orgId: string, metric: string, period: string, amount: number, limit: number): Promise<void> {
    await this.pg.query(
      `INSERT INTO billing.usage_counters (org_id, metric, period, used, limit_v)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (org_id, metric, period) DO UPDATE SET used = billing.usage_counters.used + $4`,
      [orgId, metric, period, amount, limit],
    );
  }
}
