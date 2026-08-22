import type { Metadata } from "next";
import { LegalShell, LegalSection, LegalSub, LegalList } from "../../../components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Vertofi",
  description:
    "Vertofi Privacy Policy — how we collect, use, store, share, retain, and protect your business, accounting, GST, banking, payroll, invoice and WhatsApp data.",
  alternates: { canonical: "/legal/privacy" },
  robots: { index: true, follow: true },
  openGraph: { title: "Privacy Policy | Vertofi", type: "website", url: "https://vertofi.com/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="June 16, 2026"
      intro={
        <p>
          This Privacy Policy explains how Vertofi collects, uses, discloses, retains and protects
          information when you use the Vertofi platform, websites, mobile experiences, and our WhatsApp
          Business Platform integration (collectively, the &ldquo;Services&rdquo;). By using the Services you
          agree to the practices described in this Policy.
        </p>
      }
    >
      <LegalSection id="introduction" heading="1. Introduction">
        <p>
          Vertofi is a predictive accounting and financial-intelligence platform built for Indian micro,
          small and medium enterprises (MSMEs) and the professionals who serve them. We help businesses
          automate accounting, generate GST-compliant invoices, monitor compliance, connect bank data,
          manage payroll, and receive AI-assisted financial insights — including through WhatsApp. Protecting
          the confidentiality and integrity of your financial information is fundamental to our service, and
          this Policy describes how we handle that information in a transparent and lawful manner.
        </p>
        <p>
          This Policy is published in compliance with the Information Technology Act, 2000, the Information
          Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information)
          Rules, 2011, and the Digital Personal Data Protection Act, 2023 of India, and applicable principles
          of global data-protection regulation where relevant.
        </p>
      </LegalSection>

      <LegalSection id="company" heading="2. Company Information">
        <p>
          The Services are operated by Vertofi (&ldquo;Vertofi&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
          &ldquo;our&rdquo;). For any question regarding this Policy or your personal data, you may contact us
          at <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a> or{" "}
          <a href="mailto:info@vertofi.com">info@vertofi.com</a>. Vertofi acts as a data fiduciary / data
          controller for the information you provide to operate your account, and as a data processor for the
          financial records you process through the platform on behalf of your business.
        </p>
      </LegalSection>

      <LegalSection id="information-we-collect" heading="3. Information We Collect">
        <p>
          We collect only the information needed to deliver and improve the Services. The categories of
          information we collect include:
        </p>
        <LegalSub heading="Account information">
          <p>
            Your name, email address, mobile number, password (stored only as a salted cryptographic hash),
            role, business affiliation, authentication identifiers, and preferences used to create and secure
            your account.
          </p>
        </LegalSub>
        <LegalSub heading="Business information">
          <p>
            Legal business name, trade name, business type, industry, registered and corporate addresses,
            PAN, CIN/LLPIN, Udyam registration, authorised signatory details, and organisation profile data
            used to set up and operate your workspace.
          </p>
        </LegalSub>
        <LegalSub heading="GST information">
          <p>
            GSTIN, GST registration type and status, place of supply, HSN/SAC classifications, GST returns
            data, input tax credit details, and reconciliation information between your books and the GST
            Network used to prepare filings and assess compliance.
          </p>
        </LegalSub>
        <LegalSub heading="Banking information">
          <p>
            Where you choose to connect a bank account (including via RBI-licensed Account Aggregators), we
            process bank account identifiers, statements, transaction history, balances and IFSC details
            strictly to power reconciliation, cashflow intelligence and accounting automation. We do not store
            full banking credentials, and bank connections are consent-based and revocable.
          </p>
        </LegalSub>
        <LegalSub heading="Invoice and accounting information">
          <p>
            Customers, vendors, products, invoices, purchase records, quotations, credit/debit notes,
            expenses, ledgers, inventory, vouchers and other accounting documents you create or upload, along
            with the line items, tax computations and totals contained within them.
          </p>
        </LegalSub>
        <LegalSub heading="Payroll information">
          <p>
            Where you use payroll features, employee names, designations, salary and wage components,
            statutory deductions (PF/ESI/TDS), and pay-period records used to compute and record payroll.
          </p>
        </LegalSub>
        <LegalSub heading="WhatsApp communications">
          <p>
            When you interact with the Vertofi assistant on the WhatsApp Business Platform, we process your
            WhatsApp phone number, the messages, commands, images and documents you send (such as bills to be
            digitised), and our responses, in order to provide the requested accounting and CFO-assistant
            functions. WhatsApp messaging is provided through Meta Platforms; your use of WhatsApp is also
            governed by Meta&rsquo;s and WhatsApp&rsquo;s own terms and privacy policies.
          </p>
        </LegalSub>
        <LegalSub heading="Device and usage information">
          <p>
            Technical data such as IP address, browser and device type, operating system, log timestamps,
            pages and features used, and diagnostic information collected to secure the Services, prevent
            fraud, and improve reliability.
          </p>
        </LegalSub>
      </LegalSection>

      <LegalSection id="how-we-use" heading="4. How We Use Information">
        <p>We use the information we collect to:</p>
        <LegalList
          items={[
            "Create, authenticate and secure your account and workspace;",
            "Automate accounting, generate GST-compliant invoices and statutory documents, and reconcile bank, GST and book data;",
            "Compute financial intelligence such as the Business Health Score, cashflow forecasts, tax warnings and profit-leak detection;",
            "Operate payroll, vendor and inventory features you choose to use;",
            "Deliver our WhatsApp assistant and respond to your instructions;",
            "Process subscriptions, billing and payments;",
            "Provide customer support and respond to your requests;",
            "Detect, prevent and investigate fraud, abuse and security incidents;",
            "Comply with legal, tax, accounting and regulatory obligations; and",
            "Improve and develop the Services.",
          ]}
        />
        <p>
          We process your information on the lawful bases of performance of our contract with you, your
          consent (which you may withdraw), our legitimate interests in operating and securing the Services,
          and compliance with legal obligations. <strong>We never sell your personal or financial data.</strong>
        </p>
      </LegalSection>

      <LegalSection id="ai-processing" heading="5. AI Processing and Financial Intelligence">
        <p>
          Vertofi uses artificial intelligence and statistical models to digitise documents, classify
          transactions, suggest HSN/SAC codes and tax rates, draft accounting entries, and generate financial
          insights and recommendations. AI processing is performed to deliver features you request. AI-generated
          outputs are informational aids only and may contain errors; they do not constitute professional
          financial, tax, legal, accounting or investment advice, and you remain responsible for reviewing and
          approving all entries, filings and business decisions. Where third-party AI providers are used to
          process content, we share only the data necessary for the specific task and require appropriate
          confidentiality and security commitments.
        </p>
      </LegalSection>

      <LegalSection id="third-party" heading="6. Third-Party Integrations">
        <p>
          To deliver the Services we integrate with trusted third parties, including: the WhatsApp Business
          Platform (Meta) for messaging; payment and subscription processors (such as Razorpay) for billing;
          GST Suvidha Providers and the GST Network for filings and GSTIN verification; RBI-licensed Account
          Aggregators and banking partners for consent-based bank data; SMS/email delivery providers for
          one-time passwords and notifications; cloud infrastructure and AI providers for hosting and
          processing. These providers process information only as needed to perform their function and under
          contractual confidentiality and security obligations.
        </p>
      </LegalSection>

      <LegalSection id="sharing" heading="7. Data Sharing and Disclosure">
        <p>We disclose information only in limited circumstances:</p>
        <LegalList
          items={[
            "With service providers and integrations acting on our behalf, as described above;",
            "With professionals (such as your chartered accountant) only when you explicitly grant them access;",
            "To comply with applicable law, regulation, legal process, or a lawful government request;",
            "To protect the rights, property, safety and security of Vertofi, our users, or the public, and to prevent fraud;",
            "In connection with a merger, acquisition, financing or sale of assets, subject to this Policy; and",
            "With your consent or at your direction.",
          ]}
        />
        <p>
          Any benchmarking or industry analytics we publish are aggregated and anonymised and never identify
          an individual business.
        </p>
      </LegalSection>

      <LegalSection id="storage-security" heading="8. Data Storage and Security">
        <p>
          Financial data is hosted in India. We apply reasonable security practices designed to protect your
          information, including encryption in transit (TLS) and at rest, strict multi-tenant isolation so no
          organisation can access another&rsquo;s data, role-based access controls, hashed credentials,
          immutable audit logging of sensitive actions, network controls and continuous monitoring. While we
          work hard to protect your information, no method of transmission or storage is completely secure. See
          our <a href="/legal/security">Security Policy</a> for more detail.
        </p>
      </LegalSection>

      <LegalSection id="retention" heading="9. Data Retention Policy">
        <p>
          We retain personal and financial information for as long as your account is active and as needed to
          provide the Services. Because Vertofi processes accounting and tax records, certain data must be
          retained to meet statutory obligations under Indian tax, GST, companies and accounting law —
          generally up to eight (8) years, or longer where a specific law, audit, dispute or legal hold
          requires. When information is no longer required, we delete or irreversibly anonymise it. See our{" "}
          <a href="/legal/data-deletion">Data Deletion</a> page for how to request deletion and which records
          may be lawfully retained.
        </p>
      </LegalSection>

      <LegalSection id="user-rights" heading="10. User Rights">
        <p>Subject to applicable law and statutory retention requirements, you have the right to:</p>
        <LegalSub heading="Data Access Requests">
          <p>Request a copy of, and information about, the personal data we hold about you.</p>
        </LegalSub>
        <LegalSub heading="Data Correction Requests">
          <p>Request correction of inaccurate or incomplete personal data.</p>
        </LegalSub>
        <LegalSub heading="Data Portability">
          <p>Request an export of your data in a structured, commonly used, machine-readable format.</p>
        </LegalSub>
        <LegalSub heading="Data Deletion Requests">
          <p>
            Request deletion of your account and personal data, subject to records we are legally required to
            retain. To exercise this right, follow the steps on our{" "}
            <a href="/legal/data-deletion">Data Deletion</a> page or email{" "}
            <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a>.
          </p>
        </LegalSub>
        <p>
          You may also withdraw consent, including for bank-data connections and WhatsApp communications, at
          any time. To exercise any right, contact <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a>.
          We will verify your identity before acting on a request and respond within the timelines required by
          law.
        </p>
      </LegalSection>

      <LegalSection id="cookies" heading="11. Cookies and Analytics">
        <p>
          We use strictly necessary cookies and similar technologies to keep you signed in, remember
          preferences, secure the Services, and understand aggregate usage so we can improve performance. You
          can control cookies through your browser settings; disabling some cookies may affect functionality.
          We do not use cookies to sell your data.
        </p>
      </LegalSection>

      <LegalSection id="international" heading="12. International Transfers">
        <p>
          Your financial data is primarily stored and processed in India. Where a third-party integration or
          infrastructure provider processes limited data outside India, we take steps to ensure such transfers
          are subject to appropriate safeguards and confidentiality and security commitments consistent with
          this Policy and applicable law.
        </p>
      </LegalSection>

      <LegalSection id="children" heading="13. Children's Privacy">
        <p>
          The Services are intended for businesses and individuals aged 18 and above and are not directed to
          children. We do not knowingly collect personal data from children. If you believe a child has
          provided us personal data, contact <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a> and we
          will take appropriate action.
        </p>
      </LegalSection>

      <LegalSection id="changes" heading="14. Changes To This Policy">
        <p>
          We may update this Policy from time to time to reflect changes in our practices, technology, or
          legal requirements. We will post the updated Policy here with a revised &ldquo;Last updated&rdquo;
          date and, where appropriate, provide additional notice. Your continued use of the Services after an
          update constitutes acceptance of the revised Policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="15. Contact Information">
        <p>
          For questions, requests or complaints about this Policy or your data, contact us at{" "}
          <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a> (privacy matters) or{" "}
          <a href="mailto:info@vertofi.com">info@vertofi.com</a> (general enquiries).
        </p>
      </LegalSection>

      <LegalSection id="grievance-officer" heading="16. Grievance Officer Information">
        <p>
          In accordance with the Information Technology Act, 2000 and rules made thereunder, and the Digital
          Personal Data Protection Act, 2023, the Grievance Officer can be reached at{" "}
          <a href="mailto:privacy@vertofi.com">privacy@vertofi.com</a>. Please include &ldquo;Grievance&rdquo;
          in your subject line along with your name, registered contact details, and a description of your
          concern. We will acknowledge your grievance and endeavour to resolve it within the timelines
          prescribed under applicable law.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
