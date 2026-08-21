# Build Verification Report

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039
**Verification date:** 3 June 2026

This report records the reproducible verification that the platform compiles and
integrates. Re-run the commands below to reproduce.

## 1. Workspace composition (verified)

| Category | Count |
|----------|------:|
| Backend microservices | 31 (28 TypeScript + 3 Python) |
| Web applications | 4 |
| Shared packages | 8 |
| Database migrations | 19 |
| Engineering documents | 34 (26 numbered + 8 service specs) |
| TypeScript/TSX source files | 209 |
| Python source files | 12 |

## 2. TypeScript / Node build

Command:
```bash
pnpm build
```
Result:
```
Tasks:    38 successful, 38 total
Cached:   38 cached, 38 total
>>> FULL TURBO
```
**Outcome: PASS** — all build tasks succeeded with zero failures.

## 3. Python services compile

Command:
```bash
python -m py_compile services/ai-gateway/app/*.py
python -m py_compile services/categorization/app/*.py
python -m py_compile services/ocr/app/*.py
```
Result:
```
ai-gateway OK
categorization OK
ocr OK
```
**Outcome: PASS.**

## 4. Frontend production builds (static generation verified)

| App | Routes generated |
|-----|------------------|
| web-landing | / · /about · /pricing · /blog · /contact · /features · /legal/{privacy,terms,security} |
| web-business | / · /login · /register · /onboarding · /dashboard |
| web-panels | /associates · /accountants · /bhs · /legal · /login |
| web-admin (internal) | /admin (10-tab console) · /teams · /login |

All four applications complete `next build` and prerender successfully.

## 5. Quality gates available

- Lint (`pnpm lint`), typecheck (`pnpm typecheck`), tests (`pnpm test`).
- CI: build pipeline + security pipeline (gitleaks, CodeQL, dependency audit,
  Trivy, Terraform validate) under `.github/workflows/`.

## 6. Environment note

This verification was performed in an environment without Docker; the runtime
behaviour of containers and Kafka consumers should additionally be validated on
an environment with Docker before production cutover. All source compiles clean.

## 7. Attestation

| Verified by | Signature | Date |
|-------------|-----------|------|
| __________________ | __________________ | ____________ |
