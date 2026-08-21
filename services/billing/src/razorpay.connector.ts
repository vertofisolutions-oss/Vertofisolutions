import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { Connector, EnvCredentialVault, retry, type ConnectorMeta } from "@vertofi/connectors";

/**
 * Razorpay payments connector (docs/09). When keys are absent it reports
 * NEEDS_CREDENTIALS and the billing UI shows an activation state — checkout
 * is simply unavailable, never faked.
 */
@Injectable()
export class RazorpayConnector extends Connector {
  private readonly vault = new EnvCredentialVault();

  constructor() {
    const meta: ConnectorMeta = {
      id: "payments.razorpay",
      category: "payments",
      provider: "Razorpay",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
    super(meta);
  }

  hasCredentials(): boolean {
    return this.vault.has("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET");
  }

  /** Create a Razorpay order for the given amount (paise). */
  async createOrder(amountInr: number, receipt: string): Promise<{ id: string; amount: number }> {
    this.assertActive();
    const keyId = this.vault.get("RAZORPAY_KEY_ID")!;
    const keySecret = this.vault.get("RAZORPAY_KEY_SECRET")!;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return retry(async () => {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({ amount: Math.round(amountInr * 100), currency: "INR", receipt }),
      });
      if (!res.ok) throw new Error(`razorpay_http_${res.status}`);
      return (await res.json()) as { id: string; amount: number };
    });
  }

  private auth(): string {
    const keyId = this.vault.get("RAZORPAY_KEY_ID")!;
    const keySecret = this.vault.get("RAZORPAY_KEY_SECRET")!;
    return Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  }

  /**
   * The Razorpay plan id for a tier + cycle (created once in the dashboard /
   * setup-razorpay.ps1). Reads RAZORPAY_PLAN_<TIER>_<CYCLE> (e.g.
   * RAZORPAY_PLAN_STARTER_YEARLY) and falls back to the legacy
   * RAZORPAY_PLAN_<TIER> for monthly so existing configs keep working.
   */
  planId(plan: string, cycle: "MONTHLY" | "YEARLY" = "MONTHLY"): string | undefined {
    return this.vault.get(`RAZORPAY_PLAN_${plan}_${cycle}`) ?? (cycle === "MONTHLY" ? this.vault.get(`RAZORPAY_PLAN_${plan}`) : undefined);
  }

  keyId(): string {
    return this.vault.get("RAZORPAY_KEY_ID") ?? "";
  }

  /**
   * Create a Razorpay Subscription on a tier plan (monthly OR yearly) with a
   * 7-day trial. The first autopay charge happens after the trial (start_at).
   * The customer authorizes a UPI AutoPay / card e-mandate when they complete
   * the subscription checkout (short_url, or Checkout with subscription_id). RBI
   * rules (mandate cap + 24h pre-debit notice) are handled by Razorpay; we pass
   * the customer's contact so those notices reach them.
   */
  async createSubscription(
    plan: string,
    orgId: string,
    cycle: "MONTHLY" | "YEARLY" = "MONTHLY",
    trialDays = 7,
    customer?: { email?: string; phone?: string },
  ): Promise<{ id: string; short_url: string; status: string }> {
    this.assertActive();
    const planId = this.planId(plan, cycle);
    if (!planId) throw new Error(`razorpay_plan_not_configured_${plan}_${cycle}`);
    const startAt = Math.floor(Date.now() / 1000) + trialDays * 86400;
    // 10 years of cycles either way (monthly→120, yearly→10); cancellable anytime.
    const totalCount = cycle === "YEARLY" ? 10 : 120;
    const notifyInfo: Record<string, string> = {};
    if (customer?.email) notifyInfo.notify_email = customer.email;
    if (customer?.phone) notifyInfo.notify_phone = customer.phone;
    return retry(async () => {
      const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${this.auth()}` },
        body: JSON.stringify({
          plan_id: planId,
          total_count: totalCount,
          customer_notify: 1,
          start_at: startAt, // first charge AFTER the 7-day trial
          ...(Object.keys(notifyInfo).length ? { notify_info: notifyInfo } : {}),
          notes: { org_id: orgId, plan, cycle },
        }),
      });
      if (!res.ok) throw new Error(`razorpay_sub_http_${res.status}`);
      return (await res.json()) as { id: string; short_url: string; status: string };
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    this.assertActive();
    await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${this.auth()}` },
      body: JSON.stringify({ cancel_at_cycle_end: 0 }),
    });
  }

  /** Verify a Razorpay webhook signature (docs/09 webhooks are signature-verified).
   *  Must run over the EXACT received bytes — pass req.rawBody (Buffer), not a
   *  re-stringified body. */
  verifyWebhook(body: string | Buffer, signature: string): boolean {
    const secret = this.vault.get("RAZORPAY_WEBHOOK_SECRET");
    if (!secret || !signature) return false;
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    // timing-safe compare to avoid signature oracle
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
