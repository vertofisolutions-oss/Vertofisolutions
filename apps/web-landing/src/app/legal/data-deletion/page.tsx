import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalList } from "../../../components/LegalShell";

export const metadata: Metadata = {
  title: "Data Deletion | Vertofi",
  description:
    "How to request deletion of your Vertofi account and personal data, the verification process and timeline, and which accounting, GST and tax records may be retained for statutory compliance.",
  alternates: { canonical: "/legal/data-deletion" },
  robots: { index: true, follow: true },
  openGraph: { title: "Data Deletion | Vertofi", type: "website", url: "https://vertofi.com/legal/data-deletion" },
};

export default function DataDeletionPage() {
  return (
    <LegalShell
      title="Data Deletion Instructions"
      updated="June 16, 2026"
      intro={
        <p>
          Vertofi respects your right to delete your account and personal data. This page explains how to
          request account and data deletion, how we verify and process requests, the expected timeline, and
          which records may need to be retained to meet statutory accounting, GST, tax, audit and legal
          obligations. This page is publicly accessible and requires no login.
        </p>
      }
    >
      <LegalSection id="how-to-request-account" heading="1. How to Request Account Deletion">
        <p>To delete your Vertofi account, choose either option:</p>
        <LegalList
          items={[
            <>
              Email <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a> from your registered email
              address with the subject line &ldquo;Account Deletion Request&rdquo;, including your registered
              name, business name and registered mobile number; or
            </>,
            <>
              From within the Vertofi app, contact support and request account deletion; our team will guide
              you through verification.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="how-to-request-data" heading="2. How to Request Data Deletion">
        <p>
          If you wish to delete specific personal data rather than your entire account, email{" "}
          <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a> with the subject line &ldquo;Data
          Deletion Request&rdquo; and describe the data you want removed. If you connected WhatsApp, banking or
          other integrations, you may also withdraw those consents at any time, which stops further processing
          from those sources.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="3. Contact Email for Deletion Requests">
        <p>
          All deletion requests are handled at{" "}
          <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a>. Please send your request from the email
          address associated with your account to help us verify your identity quickly.
        </p>
      </LegalSection>

      <LegalSection id="verification" heading="4. Verification Process">
        <p>
          To protect your financial data, we verify the identity of every requester before acting. We may ask
          you to confirm the request from your registered email or mobile, or to provide information that
          matches our records. We will not action a deletion request we cannot verify, to prevent unauthorised
          deletion of business records.
        </p>
      </LegalSection>

      <LegalSection id="timeline" heading="5. Processing Timeline">
        <p>
          We acknowledge deletion requests within seventy-two (72) hours. Once verified, we delete or
          irreversibly anonymise eligible personal data within thirty (30) days. Data held in encrypted backups
          is purged on our regular backup-rotation cycle, typically within ninety (90) days. Data that we are
          legally required to retain is segregated and access-restricted until its statutory retention period
          expires, after which it is deleted.
        </p>
      </LegalSection>

      <LegalSection id="retained" heading="6. Records That May Be Legally Retained">
        <p>
          Because Vertofi processes accounting, GST, payroll and tax records, certain information must be
          retained even after an account is deleted, to comply with Indian law and to meet audit, compliance
          and legal obligations. This may include:
        </p>
        <LegalList
          items={[
            "Invoices, accounting books, ledgers and financial statements retained under tax and companies law (generally up to 8 years);",
            "GST records and returns retained under the Goods and Services Tax law;",
            "Payroll and statutory deduction records (PF/ESI/TDS) retained as required;",
            "Transaction and billing records needed for tax, accounting and dispute resolution;",
            "Records subject to an ongoing audit, investigation, legal hold or dispute; and",
            "Minimal records required to demonstrate compliance with deletion and consent obligations.",
          ]}
        />
      </LegalSection>

      <LegalSection id="exceptions" heading="7. Compliance Retention Exceptions">
        <p>
          Where retention is required by law, we retain only the minimum data necessary for the specific
          statutory purpose, restrict access to it, and delete it once the applicable retention period ends or
          the legal obligation no longer applies. All other personal data eligible for deletion is removed
          within the timelines described above.
        </p>
      </LegalSection>

      <LegalSection id="confirmation" heading="8. Confirmation">
        <p>
          Once your request is processed, we will confirm completion by email and indicate any records retained
          under a statutory exception. If you have questions about deletion at any time, contact{" "}
          <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
