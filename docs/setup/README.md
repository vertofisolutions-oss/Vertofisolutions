# Vertofi — Complete Setup & Access Guide

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039

> The end-to-end manual for standing up Vertofi: how to obtain **every** API key
> and credential, fill **every** `.env` value, run **every** panel, wire AWS, set
> up payments, and understand exactly **who can access which feature**.
> Read in order for a first launch; use as reference thereafter.

## Contents

| # | Document | What it covers |
|---|----------|----------------|
| 00 | [Prerequisites & Local Setup](./00-PREREQUISITES-AND-LOCAL-SETUP.md) | Tools, install, run the whole stack locally |
| 01 | [Environment Variable Reference](./01-ENV-REFERENCE.md) | Every `.env` key, what it does, where it's used |
| 02 | [AWS Complete Setup](./02-AWS-COMPLETE-SETUP.md) | Account → IAM → S3, SES, KMS, Secrets, RDS, Redis, MSK, OpenSearch, EKS, CloudFront/WAF, Cost Explorer |
| 03 | [API Keys & Credentials — How to Obtain Each](./03-API-KEYS-AND-CREDENTIALS.md) | OpenAI, MSG91, Razorpay, WhatsApp, GST GSP, Account Aggregator, OCR, GitHub, Grafana |
| 04 | [Payment Gateway Guide](./04-PAYMENT-GATEWAY-GUIDE.md) | Razorpay end-to-end: keys, webhooks, subscriptions, after-payment gate, refunds |
| 05 | [Feature Access Hierarchy](./05-FEATURE-ACCESS-HIERARCHY.md) | Every role × every feature — who can do what, and how it's enforced |
| 06 | [Project Hierarchy](./06-PROJECT-HIERARCHY.md) | Full repo tree, monorepo layout, ownership, ports |
| 07 | [Panels & Pages Setup](./07-PANELS-AND-PAGES-SETUP.md) | Each app/panel, its pages, env, run & deploy |
| 08 | [First Launch Checklist](./08-FIRST-LAUNCH-CHECKLIST.md) | Zero → running, ticked step by step |

## Companion sets
- Engineering blueprint: [`../docs/`](../docs/README.md)
- Completion dossier: [`../completion-docs/`](../completion-docs/README.md)
- Legal & corporate: [`../legal-docs/`](../legal-docs/README.md)

## Golden rule for credentials
Any connector left blank reports **NEEDS_CREDENTIALS** and the UI shows a clean
empty/onboarding state — the app keeps working and **never shows fake data**. So
you can launch with a few keys and add the rest over time.
