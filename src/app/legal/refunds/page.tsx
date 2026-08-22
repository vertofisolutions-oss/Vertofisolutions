import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalList } from "../../../components/LegalShell";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Vertofi",
  description:
    "Vertofi's subscription cancellation, renewal, refund eligibility and non-refundable services policy for its accounting and financial-intelligence platform.",
  alternates: { canonical: "/legal/refunds" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Refund & Cancellation Policy | Vertofi",
    type: "website",
    url: "https://vertofi.com/legal/refunds",
  },
};

export default function RefundsPage() {
  return (
    <LegalShell
      title="Refund & Cancellation Policy"
      updated="June 16, 2026"
      intro={
        <p>
          This Refund &amp; Cancellation Policy explains how Vertofi subscriptions can be cancelled, how
          renewals work, and when refunds may or may not be available. It forms part of our{" "}
          <a href="/legal/terms">Terms of Service</a>.
        </p>
      }
    >
      <LegalSection id="cancellation" heading="1. Subscription Cancellation">
        <p>
          You may cancel your Subscription at any time from your account settings or by emailing{" "}
          <a href="mailto:info@vertofi.com">info@vertofi.com</a>. Cancellation takes effect at the end of your
          current billing period; you retain access to paid features until then, after which the account may
          revert to a limited or read-only state.
        </p>
      </LegalSection>

      <LegalSection id="renewal" heading="2. Renewal Terms">
        <p>
          Subscriptions renew automatically at the end of each billing cycle (monthly or annual) using the
          payment method or auto-pay mandate you authorised, until you cancel. Where required by applicable
          rules (e.g. RBI auto-payment regulations), you will receive advance notice before a recurring charge.
          You can disable renewal by cancelling before the renewal date.
        </p>
      </LegalSection>

      <LegalSection id="trial" heading="3. Free Trials">
        <p>
          If your plan includes a free trial, you will not be charged during the trial period. Unless you
          cancel before the trial ends, your Subscription converts to a paid plan and the applicable fee is
          charged. You may cancel at any time during the trial to avoid charges.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" heading="4. Refund Eligibility">
        <p>
          Except where required by law, subscription fees are generally non-refundable, and partial billing
          periods are not pro-rated upon cancellation. We may, at our discretion, consider refunds in limited
          cases such as:
        </p>
        <LegalList
          items={[
            "A duplicate or erroneous charge;",
            "A confirmed billing error on our part; or",
            "A documented, prolonged failure of a core paid feature that we were unable to remedy.",
          ]}
        />
        <p>
          To request a refund, email <a href="mailto:info@vertofi.com">info@vertofi.com</a> within 7 days of
          the charge with your account details and the reason. Approved refunds are issued to the original
          payment method via our payment processor.
        </p>
      </LegalSection>

      <LegalSection id="non-refundable" heading="5. Non-Refundable Services">
        <LegalList
          items={[
            "Fees for billing periods already elapsed or in progress;",
            "Add-ons, one-time setup, onboarding or professional-services fees once delivered;",
            "Usage-based charges already consumed;",
            "Taxes (such as GST) collected and remitted to authorities; and",
            "Compliance and statutory-filing assistance services that have already been performed.",
          ]}
        />
      </LegalSection>

      <LegalSection id="compliance-exclusions" heading="6. Compliance Service Exclusions">
        <p>
          Services involving regulatory or statutory work — including GST filings, e-invoice/e-way bill
          generation, and compliance assistance that has already been carried out — are non-refundable once
          performed, because the underlying work and any government fees cannot be reversed.
        </p>
      </LegalSection>

      <LegalSection id="how" heading="7. How Refunds Are Processed">
        <p>
          Where a refund is approved, it is processed to the original payment method through our payment
          processor (such as Razorpay). Depending on your bank or card issuer, it may take several business
          days for the amount to reflect in your account.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="8. Contact">
        <p>
          For any cancellation or refund question, contact <a href="mailto:info@vertofi.com">info@vertofi.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
