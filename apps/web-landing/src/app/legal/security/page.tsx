import type { Metadata } from "next";
import { LegalShell, LegalSection } from "../../../components/LegalShell";

export const metadata: Metadata = {
  title: "Security | Vertofi",
  description:
    "How Vertofi secures your financial data — encryption in transit and at rest, access controls, multi-tenant isolation, audit logging, backups, incident response, infrastructure and vendor security.",
  alternates: { canonical: "/legal/security" },
  robots: { index: true, follow: true },
  openGraph: { title: "Security | Vertofi", type: "website", url: "https://vertofi.com/legal/security" },
};

export default function SecurityPage() {
  return (
    <LegalShell
      title="Security"
      updated="June 16, 2026"
      intro={
        <p>
          Security is foundational to Vertofi, not an afterthought. Because we handle accounting, GST,
          banking, payroll and invoice data, we apply defense-in-depth controls across our application,
          infrastructure and operations. This page summarises those controls; detailed documentation is
          available to enterprise customers under NDA.
        </p>
      }
    >
      <LegalSection id="encryption-transit" heading="1. Encryption in Transit">
        <p>
          All data exchanged between your browser, our APIs, and integrated services is encrypted using TLS
          1.2 or higher. We enforce HTTPS across all endpoints and reject insecure connections.
        </p>
      </LegalSection>

      <LegalSection id="encryption-rest" heading="2. Encryption at Rest">
        <p>
          Data stored in our databases, object storage and backups is encrypted at rest using strong,
          industry-standard algorithms. The most sensitive identifiers receive additional field-level
          protection, and passwords are stored only as salted cryptographic hashes — never in plain text.
        </p>
      </LegalSection>

      <LegalSection id="access-controls" heading="3. Access Controls">
        <p>
          We enforce role-based and attribute-based access control so users and staff can access only what
          their role permits. Authentication supports multi-factor verification, and sensitive financial
          actions require step-up verification. Internal administrative access follows least-privilege
          principles and is restricted and monitored.
        </p>
      </LegalSection>

      <LegalSection id="tenant-isolation" heading="4. Multi-Tenant Isolation">
        <p>
          Every record is scoped to its organisation and isolation is enforced at both the application and
          database layers, including row-level security policies and per-request authorisation checks, so no
          organisation can ever read or modify another organisation&rsquo;s data. Tenant isolation is
          continuously regression-tested.
        </p>
      </LegalSection>

      <LegalSection id="audit-logging" heading="5. Audit Logging">
        <p>
          Sensitive and financial actions are recorded in an append-only, tamper-evident audit log, enabling
          traceability of who did what and when. Audit records support investigation, compliance and customer
          transparency.
        </p>
      </LegalSection>

      <LegalSection id="backups" heading="6. Backup Strategy">
        <p>
          We maintain encrypted, regularly scheduled backups with defined retention and tested restoration
          procedures to protect against data loss, with the ability to recover to a recent point in time.
        </p>
      </LegalSection>

      <LegalSection id="incident-response" heading="7. Incident Response">
        <p>
          We maintain an incident-response process to detect, triage, contain, remediate and learn from
          security events, and to notify affected customers and authorities where required by law. To report a
          security concern, email <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a> or{" "}
          <a href="mailto:info@vertofi.com">info@vertofi.com</a>.
        </p>
      </LegalSection>

      <LegalSection id="infrastructure" heading="8. Infrastructure Security">
        <p>
          The platform runs on reputable cloud infrastructure with data residency in India, network
          segmentation, restricted ingress through a hardened API gateway, rate limiting, secrets management,
          and continuous monitoring. Production access is limited, authenticated and logged.
        </p>
      </LegalSection>

      <LegalSection id="vendor-security" heading="9. Vendor Security">
        <p>
          We integrate only with reputable providers — including the WhatsApp Business Platform (Meta), payment
          processors, GST Suvidha Providers, and RBI-licensed Account Aggregators — and share only the data
          necessary for each function under contractual confidentiality and security obligations. Bank
          connections are consent-based and revocable.
        </p>
      </LegalSection>

      <LegalSection id="compliance" heading="10. Compliance Posture">
        <p>
          Vertofi is engineered toward SOC 2 and ISO 27001 control objectives and operates in line with the
          Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023. We continuously
          improve our controls as we scale. See our <a href="/legal/privacy">Privacy Policy</a> for how we
          handle personal data.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
