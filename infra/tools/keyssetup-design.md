<style>
:root{
  --navy:#0f2557; --blue:#2563eb; --indigo:#4f46e5; --ink:#1e293b; --muted:#64748b;
  --line:#e6ebf3; --bg:#f7f9fc; --green:#16a34a; --amber:#d97706; --red:#dc2626; --violet:#7c3aed;
}
*{box-sizing:border-box}
body{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:var(--ink);font-size:10.3px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0}
h1,h2,h3,h4{margin:0}
a{color:var(--blue);text-decoration:none;word-break:break-word}
p{margin:6px 0}
code{font-family:'Cascadia Code',Consolas,monospace;background:#eef2ff;color:#4338ca;padding:1px 5px;border-radius:5px;font-size:8.8px;word-break:break-word}
pre{background:#0f172a;color:#e6edf6;padding:11px 14px;border-radius:9px;font-size:8.4px;line-height:1.55;overflow-x:auto;margin:9px 0;page-break-inside:avoid;box-shadow:0 5px 16px -10px rgba(15,23,42,.55)}
pre code{background:none;color:inherit;padding:0;font-size:8.4px}

/* ---------- COVER ---------- */
.cover{position:relative;height:268mm;border-radius:18px;overflow:hidden;
  background:radial-gradient(120% 90% at 85% 8%,#4f46e5 0%,#2563eb 40%,#0f2557 100%);color:#fff;
  page-break-after:always;box-shadow:0 30px 60px -30px rgba(15,37,87,.7)}
.cover .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:26px 26px;opacity:.5}
.cover .orb{position:absolute;border-radius:50%;filter:blur(2px);opacity:.25}
.cover .orb1{width:230px;height:230px;background:#7c3aed;top:-50px;right:-40px}
.cover .orb2{width:300px;height:300px;background:#22d3ee;bottom:-90px;left:-70px;opacity:.18}
.cover .inner{position:relative;padding:34mm 26mm}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:62mm}
.brand .mark{width:46px;height:46px;border-radius:13px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;letter-spacing:-1px}
.brand .name{font-size:18px;font-weight:700;letter-spacing:.5px}
.brand .tag{font-size:9px;color:#cbd5f5;letter-spacing:.22em;text-transform:uppercase}
.cover .eyebrow{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#a5b4fc;font-weight:600;margin-bottom:14px}
.cover h1{font-size:46px;font-weight:800;line-height:1.04;letter-spacing:-1.2px;max-width:165mm}
.cover .sub{font-size:13.5px;color:#dbe4ff;margin-top:16px;max-width:150mm;line-height:1.5}
.cover .chips{display:flex;gap:9px;flex-wrap:wrap;margin-top:26px}
.cover .chip{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:6px 14px;font-size:9.5px;font-weight:600;letter-spacing:.02em}
.cover .foot{position:absolute;left:26mm;right:26mm;bottom:24mm;display:flex;justify-content:space-between;align-items:flex-end;font-size:9px;color:#aebbe0;border-top:1px solid rgba(255,255,255,.18);padding-top:12px}

/* ---------- TOC ---------- */
.toc{page-break-after:always;padding-top:4px}
.toc h2{font-size:22px;color:var(--navy);letter-spacing:-.3px;margin-bottom:4px}
.toc .rule{height:3px;width:54px;background:var(--blue);border-radius:3px;margin-bottom:18px}
.toc table{width:100%;border-collapse:collapse}
.toc td{padding:7px 0;border-bottom:1px dashed #d8e0ec;vertical-align:middle}
.toc .n{width:30px;color:var(--blue);font-weight:800;font-size:11px}
.toc .t{font-weight:600;color:#243b6b;font-size:11px}
.toc .d{color:var(--muted);font-size:9px;padding-left:10px}

/* ---------- SECTIONS ---------- */
.part{page-break-before:always;margin-top:2px}
.part-head{display:flex;align-items:center;gap:14px;margin:2px 0 14px;padding-bottom:12px;border-bottom:2px solid var(--line)}
.part-num{flex:none;width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;box-shadow:0 8px 18px -8px rgba(37,99,235,.6)}
.part-title{font-size:20px;font-weight:800;color:var(--navy);letter-spacing:-.3px}
.part-kicker{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--blue);font-weight:700}
h2.sec{font-size:13.5px;font-weight:700;color:#1d4ed8;margin:18px 0 7px;padding-left:11px;border-left:4px solid var(--indigo);page-break-after:avoid}
h3.sub{font-size:11.5px;font-weight:700;color:#334155;margin:13px 0 5px;page-break-after:avoid}

/* ---------- CARDS ---------- */
.card{background:#fff;border:1px solid var(--line);border-radius:13px;padding:14px 16px;margin:11px 0;box-shadow:0 1px 0 rgba(16,24,40,.02);page-break-inside:avoid}
.lead{background:linear-gradient(135deg,#eef4ff,#f5f3ff);border:1px solid #dce6ff;border-radius:13px;padding:14px 18px;margin:12px 0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.mini{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.mini .lab{font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:3px}

/* ---------- PILLS ---------- */
.pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:8px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;vertical-align:middle}
.pill.hard{background:#fee2e2;color:#b91c1c}
.pill.req{background:#dbeafe;color:#1d4ed8}
.pill.opt{background:#e2e8f0;color:#475569}
.pill.temp{background:#fef3c7;color:#b45309}
.pill.gen{background:#dcfce7;color:#15803d}

/* ---------- CALLOUTS ---------- */
.call{border-radius:10px;padding:10px 13px 10px 14px;margin:10px 0;font-size:9.6px;page-break-inside:avoid}
.call .h{font-weight:800;font-size:9px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:3px}
.call p{margin:2px 0}
.call.warn{background:#fff7ed;border-left:4px solid var(--amber)}
.call.warn .h{color:#b45309}
.call.info{background:#eff6ff;border-left:4px solid var(--blue)}
.call.info .h{color:#1d4ed8}
.call.tip{background:#f0fdf4;border-left:4px solid var(--green)}
.call.tip .h{color:#15803d}
.call.danger{background:#fef2f2;border-left:4px solid var(--red)}
.call.danger .h{color:#b91c1c}

/* ---------- STEPS ---------- */
ol.steps{margin:7px 0 7px 0;padding-left:0;counter-reset:s;list-style:none}
ol.steps>li{position:relative;padding:2px 0 7px 26px;margin:0}
ol.steps>li::before{counter-increment:s;content:counter(s);position:absolute;left:0;top:1px;width:17px;height:17px;border-radius:50%;background:var(--blue);color:#fff;font-size:8.5px;font-weight:800;display:flex;align-items:center;justify-content:center}
ul.clean{margin:6px 0 6px 2px;padding-left:16px}
ul.clean li{margin:3px 0}

/* ---------- PROVIDER CARD ---------- */
.prov{border:1px solid var(--line);border-radius:13px;overflow:hidden;margin:12px 0;page-break-inside:avoid;box-shadow:0 6px 18px -14px rgba(16,24,40,.3)}
.prov .bar{background:linear-gradient(135deg,#162a5c,#2563eb);color:#fff;padding:10px 15px;display:flex;align-items:center;justify-content:space-between}
.prov .bar .nm{font-size:13px;font-weight:800;letter-spacing:-.2px}
.prov .bar .vars{font-family:'Cascadia Code',Consolas,monospace;font-size:8px;color:#cfe0ff;margin-top:2px}
.prov .body{padding:12px 15px}
.prov .powers{font-size:9.4px;color:#475569;margin:0 0 8px;padding:7px 10px;background:#f8fafc;border-radius:8px;border:1px solid var(--line)}

/* ---------- TABLES ---------- */
table.t{border-collapse:collapse;width:100%;margin:11px 0;font-size:8.8px;page-break-inside:avoid;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px var(--line)}
table.t th{background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;text-align:left;padding:7px 9px;font-size:8.5px;font-weight:700;letter-spacing:.02em}
table.t td{padding:6px 9px;border-top:1px solid #eef2f8;vertical-align:top}
table.t tr:nth-child(even) td{background:#f8fafc}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:8.6px;color:var(--muted);margin:6px 0 0}
.hr{height:1px;background:var(--line);border:0;margin:16px 0}
.kbd{font-family:'Cascadia Code',Consolas,monospace;background:#0f172a;color:#e6edf6;padding:1px 6px;border-radius:5px;font-size:8.4px}
</style>

<div class="cover">
  <div class="grid"></div><div class="orb orb1"></div><div class="orb orb2"></div>
  <div class="inner">
    <div class="brand">
      <div class="mark">V</div>
      <div><div class="name">VERTOFI</div><div class="tag">Predictive Accounting Platform</div></div>
    </div>
    <div class="eyebrow">Operations Handbook</div>
    <h1>API Keys, Credentials &amp; Environment Setup</h1>
    <div class="sub">Every external service, secret, and environment variable Vertofi needs — what it is, how to obtain it, exactly where to place it, and how to verify it works. Built for a production deployment on Google Cloud (GKE Autopilot) + Vercel.</div>
    <div class="chips">
      <span class="chip">GKE Autopilot · asia-south1</span>
      <span class="chip">Vercel · 8 frontends</span>
      <span class="chip">GCP Secret Manager</span>
      <span class="chip">15+ providers</span>
    </div>
    <div class="foot">
      <div>Source of truth: <code style="background:rgba(255,255,255,.12);color:#fff">.env.example</code> · <code style="background:rgba(255,255,255,.12);color:#fff">.env.production.example</code></div>
      <div>Rev. 2026-06-06 · Confidential</div>
    </div>
  </div>
</div>

<div class="toc">
  <h2>Contents</h2><div class="rule"></div>
  <table>
    <tr><td class="n">0</td><td class="t">How configuration flows<span class="d">— the three placement targets, naming, philosophy, tools</span></td></tr>
    <tr><td class="n">1</td><td class="t">Core infrastructure<span class="d">— GCP · Cloud SQL · Memorystore · GCS · Confluent · Secret Manager</span></td></tr>
    <tr><td class="n">2</td><td class="t">Secrets you generate yourself<span class="d">— JWT · APP_FIELD_KEY · break-glass OTP</span></td></tr>
    <tr><td class="n">3</td><td class="t">External provider credentials<span class="d">— 14 providers, one card each</span></td></tr>
    <tr><td class="n">4</td><td class="t">Frontend (Vercel) variables<span class="d">— NEXT_PUBLIC_* + CORS</span></td></tr>
    <tr><td class="n">5</td><td class="t">Placement mechanics<span class="d">— the exact commands for each target</span></td></tr>
    <tr><td class="n">6</td><td class="t">Master matrix &amp; minimum-to-boot<span class="d">— every variable at a glance</span></td></tr>
    <tr><td class="n">7</td><td class="t">Verification playbook<span class="d">— curl + kubectl checks per service</span></td></tr>
    <tr><td class="n">8</td><td class="t">Rotation &amp; incident response</td></tr>
    <tr><td class="n">9</td><td class="t">FAQ &amp; troubleshooting</td></tr>
  </table>
  <div class="lead" style="margin-top:20px">
    <strong>Legend used throughout:</strong>
    <div style="margin-top:7px">
      <span class="pill hard">Hard-required</span> platform won't serve without it &nbsp;
      <span class="pill req">Required*</span> needed for login / charging &nbsp;
      <span class="pill gen">Generated</span> you create it &nbsp;
      <span class="pill temp">Temporary</span> remove after launch &nbsp;
      <span class="pill opt">Optional</span> degrades gracefully
    </div>
  </div>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">0</div><div><div class="part-kicker">Foundations</div><div class="part-title">How configuration flows</div></div></div>

  <div class="lead">Vertofi reads <strong>all</strong> runtime config from environment variables — nothing with real values is committed. The whole game is knowing <em>where each variable lives</em>. There are exactly three places.</div>

  <h2 class="sec">0.1 · The three placement targets</h2>
  <table class="t">
    <tr><th style="width:14%">Target</th><th style="width:30%">Used by</th><th style="width:40%">How it gets there</th><th>When</th></tr>
    <tr><td><strong>A — Local <code>.env</code></strong></td><td>services on your machine (<code>pnpm dev</code>, docker-compose)</td><td>edit <code>E:\VERTOFI APPLICATION\.env</code> (from <code>.env.example</code>)</td><td>local dev</td></tr>
    <tr><td><strong>B — GCP Secret Manager</strong></td><td>the 32 backend services on GKE</td><td><code>sync-secrets.ps1</code> pushes each as <code>vertofi-shared-&lt;KEY&gt;</code>; External Secrets Operator projects them into pods</td><td>prod backend</td></tr>
    <tr><td><strong>C — Vercel env</strong></td><td>the 8 Next.js frontends (<code>NEXT_PUBLIC_*</code>)</td><td>Vercel dashboard or <code>vercel env add</code></td><td>prod frontend</td></tr>
  </table>
  <div class="call info"><div class="h">Rule of thumb</div><p>Anything a <strong>backend</strong> service reads → <strong>A</strong> locally, <strong>B</strong> in prod. Anything starting <code>NEXT_PUBLIC_</code> is baked into the browser bundle → <strong>C</strong>. <strong>Never put a real secret behind a <code>NEXT_PUBLIC_</code> name</strong> — it ships to every visitor.</p></div>

  <h2 class="sec">0.2 · Naming convention in Secret Manager</h2>
  <p>Every backend secret uses a shared prefix: <code>OPENAI_API_KEY</code> → Secret Manager secret <code>vertofi-shared-OPENAI_API_KEY</code>. ESO finds them by that prefix and injects the bare name into the pod. <strong>One shared set is used by all services</strong> — no per-service secrets.</p>

  <h2 class="sec">0.3 · The "NEEDS_CREDENTIALS" philosophy</h2>
  <p>A missing credential <strong>never crashes the platform and never fakes data</strong>. Leave <code>AA_CLIENT_ID</code> blank → the bank connector returns <code>NEEDS_CREDENTIALS</code> and the UI shows an honest empty state. So you can launch with just the core + a minimal set and add the rest later.</p>
  <div class="grid3">
    <div class="mini"><div class="lab">Hard-required</div>DB · Redis · Kafka · S3 · JWT × 2 · APP_FIELD_KEY · CORS_ORIGINS</div>
    <div class="mini"><div class="lab">To log in</div>SMTP <em>or</em> MSG91 — or temporary break-glass OTP</div>
    <div class="mini"><div class="lab">Everything else</div>degrades gracefully to an empty state</div>
  </div>

  <h2 class="sec">0.4 · Tools you must install</h2>
  <ul class="clean">
    <li><strong>Google Cloud SDK</strong> (<code>gcloud</code>) — <a>cloud.google.com/sdk/docs/install</a></li>
    <li><strong>kubectl · helm · terraform</strong> (already present)</li>
    <li><strong>Vercel CLI</strong> — <code>npm i -g vercel</code></li>
    <li><strong>Node 22 + pnpm 10</strong>, PowerShell for the <code>infra/gke/*.ps1</code> scripts</li>
  </ul>

  <h2 class="sec">0.5 · Security rules (non-negotiable)</h2>
  <ol class="steps">
    <li>Never commit <code>.env</code> / <code>.env.production</code> with real values (they're gitignored — keep it so).</li>
    <li>Never put a secret behind a <code>NEXT_PUBLIC_</code> name.</li>
    <li>Use a dedicated mailbox / sub-account per provider so you can rotate without breaking personal logins.</li>
    <li>Use test/sandbox keys until verified end-to-end, then swap to live (Razorpay, GST, AA especially).</li>
    <li>Turn <strong>off</strong> <code>OTP_BYPASS_ENABLED</code> the moment real OTP delivery works.</li>
    <li>Rotate any key that ever appears in a log, screenshot, or chat (Part 8).</li>
  </ol>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">1</div><div><div class="part-kicker">Required</div><div class="part-title">Core infrastructure</div></div></div>
  <p>Mostly produced by <code>terraform apply</code>, but you must capture each connection string / key into <code>.env.production</code>.</p>

  <h2 class="sec">1.1 · GCP project &amp; billing <span class="pill hard">Hard</span></h2>
  <ol class="steps">
    <li>Create/choose a project at <a>console.cloud.google.com/projectcreate</a> — note the <strong>Project ID</strong> (e.g. <code>vertofi-prod-001</code>).</li>
    <li>Link a billing account: <a>console.cloud.google.com/billing</a>.</li>
    <li>Authenticate: <code>gcloud auth login</code> · <code>gcloud config set project &lt;id&gt;</code> · <code>gcloud auth application-default login</code>.</li>
    <li>Enable APIs:</li>
  </ol>
<pre><code>gcloud services enable container.googleapis.com sqladmin.googleapis.com \
  redis.googleapis.com storage.googleapis.com secretmanager.googleapis.com \
  artifactregistry.googleapis.com vision.googleapis.com cloudbilling.googleapis.com \
  iam.googleapis.com --project vertofi-prod-001</code></pre>
<pre><code>GOOGLE_CLOUD_PROJECT=vertofi-prod-001
GCP_REGION=asia-south1
GCP_BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX</code></pre>

  <h2 class="sec">1.2 · Cloud SQL (Postgres 16) → <code>DATABASE_URL</code> <span class="pill hard">Hard</span></h2>
  <p>Created by Terraform (HA, PITR, encrypted). Capture the private IP + password; use the Cloud SQL Auth Proxy for migrations.</p>
<pre><code>DATABASE_URL=postgresql://vertofi:&lt;PASS&gt;@&lt;PRIVATE_IP&gt;:5432/vertofi
DB_SSL=true
DATABASE_URL_RO=postgresql://vertofi:&lt;PASS&gt;@&lt;REPLICA_IP&gt;:5432/vertofi   # optional</code></pre>
  <div class="call warn"><div class="h">Before signups</div><p>Run <code>pnpm migrate</code> per service against Cloud SQL (via the Auth Proxy or a one-shot Job).</p></div>

  <div class="grid2">
    <div class="card"><h3 class="sub">1.3 · Memorystore → <code>REDIS_URL</code> <span class="pill hard">Hard</span></h3>
      <p>Console → <a>memorystore/redis/instances</a>. Powers sessions, AI-usage metering, rate limits, caches.</p>
      <pre><code>REDIS_URL=redis://&lt;HOST&gt;:6379</code></pre></div>
    <div class="card"><h3 class="sub">1.6 · Artifact Registry</h3>
      <p>Images at <code>asia-south1-docker.pkg.dev/&lt;proj&gt;/vertofi</code>, built by GitHub Actions. Repo secrets:</p>
      <pre><code>GCP_PROJECT_ID  GCP_REGION  GCP_SA_KEY</code></pre></div>
  </div>

  <h2 class="sec">1.4 · Cloud Storage + HMAC → <code>S3_*</code> <span class="pill hard">Hard</span></h2>
  <p>Vertofi uses the GCS <strong>S3-compatible</strong> API, so it needs S3-style HMAC keys for the runtime SA.</p>
<pre><code>gcloud storage hmac create vertofi-runtime@vertofi-prod-001.iam.gserviceaccount.com \
  --project vertofi-prod-001        # → Access ID (S3_ACCESS_KEY) + Secret (S3_SECRET_KEY)</code></pre>
<pre><code>S3_ENDPOINT=https://storage.googleapis.com   S3_FORCE_PATH_STYLE=true
S3_REGION=asia-south1   S3_BUCKET=&lt;documents bucket&gt;
S3_ACCESS_KEY=&lt;HMAC Access ID&gt;   S3_SECRET_KEY=&lt;HMAC Secret&gt;</code></pre>

  <h2 class="sec">1.5 · Confluent Cloud (Kafka) → <code>KAFKA_*</code> <span class="pill hard">Hard</span></h2>
  <p>The entire event pipeline (document → OCR → categorization → ledger → BHS, audit black box) runs on Kafka.</p>
  <ol class="steps">
    <li>Sign up at <a>confluent.cloud</a>; create a Basic cluster near asia-south1.</li>
    <li>Cluster → <strong>API keys</strong> → create (cluster-scoped). Save Key + Secret.</li>
    <li>Copy the <strong>Bootstrap server</strong> (<code>pkc-xxxxx.&lt;region&gt;.gcp.confluent.cloud:9092</code>).</li>
  </ol>
<pre><code>KAFKA_BROKERS=pkc-xxxxx.asia-south1.gcp.confluent.cloud:9092
KAFKA_CLIENT_ID=vertofi   KAFKA_SSL=true   KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=&lt;Confluent API Key&gt;   KAFKA_SASL_PASSWORD=&lt;Confluent API Secret&gt;</code></pre>
  <div class="call info"><div class="h">Python services</div><p>ocr · ai-gateway · categorization read the same SASL vars and build <code>security_protocol=SASL_SSL</code> automatically.</p></div>

  <h2 class="sec">1.7 · Secret Manager + External Secrets Operator</h2>
  <p>Target <strong>B</strong>. You don't create secrets by hand — <code>sync-secrets.ps1</code> does it from <code>.env.production</code>; ESO + the <code>ClusterSecretStore gcp-secret-manager</code> are installed by <code>deploy-gke.ps1</code> (commands in Part 5).</p>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">2</div><div><div class="part-kicker">You create these</div><div class="part-title">Self-generated secrets</div></div></div>

  <h2 class="sec">2.1 · JWT secrets <span class="pill gen">Generated</span> <span class="pill hard">Hard</span></h2>
  <p>Used by <code>auth</code> to sign access + refresh tokens. <strong>Services fail-fast in production if missing or &lt;16 chars.</strong> Use two different long random strings.</p>
<pre><code># PowerShell
[Convert]::ToBase64String((1..48 | %{Get-Random -Max 256}))   # JWT_ACCESS_SECRET
[Convert]::ToBase64String((1..48 | %{Get-Random -Max 256}))   # JWT_REFRESH_SECRET
# or:  openssl rand -base64 48</code></pre>
<pre><code>JWT_ACCESS_SECRET=&lt;random ≥16, unique&gt;   JWT_REFRESH_SECRET=&lt;random, different&gt;
JWT_ACCESS_TTL=900        JWT_REFRESH_TTL=2592000</code></pre>

  <h2 class="sec">2.2 · <code>APP_FIELD_KEY</code> (pgcrypto) <span class="pill gen">Generated</span> <span class="pill hard">Hard</span></h2>
  <p>Symmetric key for at-rest field encryption in admin-console. Generate once and <strong>never lose it</strong> — losing it makes encrypted fields unreadable.</p>
<pre><code>openssl rand -base64 32        # → APP_FIELD_KEY</code></pre>

  <h2 class="sec">2.3 · Break-glass OTP <span class="pill temp">Temporary</span></h2>
  <p>Lets the pilot team log in <em>before</em> SMTP/SMS is live. Not a hardcoded code — you set a per-deployment operator secret.</p>
<pre><code>OTP_BYPASS_ENABLED=1     OTP_BYPASS_CODE=&lt;your 6-digit operator secret&gt;</code></pre>
  <div class="call danger"><div class="h">Disable after launch</div><p>Set <code>OTP_BYPASS_ENABLED=0</code> (or remove both) the moment <code>SMTP_*</code> or <code>MSG91_*</code> deliver real codes. Leaving it on in production is a standing backdoor.</p></div>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">3</div><div><div class="part-kicker">14 providers · one card each</div><div class="part-title">External provider credentials</div></div></div>

  <div class="prov"><div class="bar"><div><div class="nm">OpenAI</div><div class="vars">OPENAI_API_KEY · AI_USD_PER_1K_TOKENS</div></div><span class="pill req" style="background:#bfdbfe">Strongly recommended</span></div>
    <div class="body">
      <div class="powers"><strong>Powers</strong> ai-gateway → categorization · accounting AI-draft · Voice-CFO · legal analysis · WhatsApp AI. Without it the gateway degrades honestly (rules fallback; no AI drafts).</div>
      <ol class="steps"><li>Sign up: <a>platform.openai.com/signup</a>; add billing + a usage cap.</li><li>Create a key (inside a Project for scoped spend): <a>platform.openai.com/api-keys</a> → copy <code>sk-…</code> (shown once).</li></ol>
      <pre><code>OPENAI_API_KEY=sk-proj-xxxxxxxx     AI_USD_PER_1K_TOKENS=0.0006</code></pre>
      <div class="grid3"><div class="mini"><div class="lab">Place</div>Backend (A/B)</div><div class="mini"><div class="lab">Verify</div>ai-gateway /health → openai: configured; create an AI-draft invoice</div><div class="mini"><div class="lab">Cost</div>Per-token; set a monthly cap</div></div>
    </div></div>

  <div class="prov"><div class="bar"><div><div class="nm">Google Cloud Vision</div><div class="vars">GOOGLE_VISION_KEY</div></div><span class="pill opt" style="background:#cbd5e1">Recommended</span></div>
    <div class="body">
      <div class="powers"><strong>Powers</strong> the <code>ocr</code> service. Without it, uploads route to human review (<code>NEEDS_REVIEW</code>) instead of auto-extraction.</div>
      <h3 class="sub">Option A — Workload Identity (recommended on GKE)</h3>
      <p>Leave the key blank; grant the runtime SA Vision access:</p>
      <pre><code>gcloud services enable vision.googleapis.com --project vertofi-prod-001
gcloud projects add-iam-policy-binding vertofi-prod-001 \
  --member serviceAccount:vertofi-runtime@vertofi-prod-001.iam.gserviceaccount.com \
  --role roles/serviceusage.serviceUsageConsumer</code></pre>
      <h3 class="sub">Option B — API key</h3>
      <p><a>console.cloud.google.com/apis/credentials</a> → Create API key → restrict to <em>Cloud Vision API</em>.</p>
      <pre><code>GOOGLE_VISION_KEY=AIza...</code></pre>
      <div class="grid2"><div class="mini"><div class="lab">Verify</div>Upload a clear invoice → fields populate</div><div class="mini"><div class="lab">Cost</div>1,000 units/mo free, then per-1,000 — cloud.google.com/vision/pricing</div></div>
    </div></div>

  <div class="prov"><div class="bar"><div><div class="nm">Gemini</div><div class="vars">GEMINI_API_KEY</div></div><span class="pill opt">Optional</span></div>
    <div class="body"><div class="powers">Optional secondary LLM. Leave blank if OpenAI-only (the default policy).</div>
      <p>Key from Google AI Studio: <a>aistudio.google.com/app/apikey</a> → <code>GEMINI_API_KEY=AIza...</code> · Place: backend.</p></div></div>

  <div class="prov"><div class="bar"><div><div class="nm">MSG91 — SMS OTP (India / TRAI-DLT)</div><div class="vars">MSG91_AUTH_KEY · MSG91_SENDER_ID · MSG91_TEMPLATE_ID</div></div><span class="pill req">Login*</span></div>
    <div class="body">
      <div class="powers"><strong>Powers</strong> <code>auth</code> SMS OTP. Sending to Indian numbers legally requires <strong>TRAI DLT</strong> registration (sender ID + template approval). Budget a few business days.</div>
      <ol class="steps">
        <li>Account: <a>msg91.com/signup</a>.</li>
        <li><strong>DLT registration</strong> (one-time): register on a DLT portal → get Principal Entity ID, an approved 6-char Header/Sender ID (e.g. <code>VERTFI</code>), and approved content templates (each gets a DLT Template ID).</li>
        <li>Link DLT in MSG91, create + approve the OTP template.</li>
        <li>Auth Key: <a>control.msg91.com</a> → Settings/API → Auth Key.</li>
      </ol>
      <pre><code>MSG91_AUTH_KEY=&lt;auth key&gt;   MSG91_SENDER_ID=VERTFI   MSG91_TEMPLATE_ID=&lt;DLT template id&gt;
# optional per-purpose: MSG91_TEMPLATE_ID_LOGIN / _REGISTER / _RESET / _FINANCIAL / _DOCUMENT / _MFA</code></pre>
      <div class="grid3"><div class="mini"><div class="lab">Place</div>Backend</div><div class="mini"><div class="lab">Verify</div>Request OTP with an Indian mobile → SMS in seconds</div><div class="mini"><div class="lab">Cost</div>Per-SMS prepaid wallet</div></div>
    </div></div>

  <div class="prov"><div class="bar"><div><div class="nm">Email / SMTP</div><div class="vars">SMTP_HOST · _PORT · _USER · _PASS · _FROM</div></div><span class="pill req">Login*</span></div>
    <div class="body">
      <div class="powers"><strong>Powers</strong> <code>auth</code> email OTP + <code>notification</code> dispatch. Any SMTP provider works.</div>
      <h3 class="sub">Option A — Google Workspace app password (fastest)</h3>
      <ol class="steps"><li>Enable 2-Step Verification on the sending mailbox.</li><li>Create an App Password: <a>myaccount.google.com/apppasswords</a> → Mail → copy 16 chars.</li></ol>
      <pre><code>SMTP_HOST=smtp.gmail.com  SMTP_PORT=587  SMTP_USER=no-reply@vertofi.com
SMTP_PASS=&lt;16-char app password&gt;  SMTP_FROM=no-reply@vertofi.com</code></pre>
      <h3 class="sub">Option B — Dedicated ESP (better at scale)</h3>
      <ul class="clean"><li><strong>SendGrid</strong>: host <code>smtp.sendgrid.net</code>, user literally <code>apikey</code>, pass = API key.</li><li><strong>Brevo</strong>: <code>smtp-relay.brevo.com</code>:587. <strong>Mailgun</strong>: <code>smtp.mailgun.org</code>.</li></ul>
      <div class="call tip"><div class="h">Deliverability</div><p>Add <strong>SPF + DKIM + DMARC</strong> DNS records for vertofi.com or OTP emails land in spam. Each provider shows the exact records.</p></div>
    </div></div>

  <div class="prov"><div class="bar"><div><div class="nm">Meta WhatsApp Business</div><div class="vars">WHATSAPP_API_TOKEN · _PHONE_ID · _VERIFY_TOKEN · _APP_SECRET</div></div><span class="pill opt">Optional</span></div>
    <div class="body">
      <div class="powers"><strong>Powers</strong> the <code>whatsapp</code> service (inbound webhook, AI replies, photo→document, plan-aware menus).</div>
      <ol class="steps">
        <li><a>developers.facebook.com</a> → Create App → Business; add the WhatsApp product.</li>
        <li>Add your business number + complete Business Verification (<a>business.facebook.com</a>).</li>
        <li>Generate a <strong>permanent System-User token</strong> with <code>whatsapp_business_messaging</code> + <code>_management</code>.</li>
        <li>Note the <strong>Phone Number ID</strong>; get the <strong>App Secret</strong> (App → Settings → Basic).</li>
        <li>Choose your own <strong>verify token</strong> string.</li>
        <li>Webhook callback = <code>https://&lt;whatsapp ingress&gt;/webhook</code> (its own ingress, <em>not</em> the gateway); subscribe to <code>messages</code>.</li>
      </ol>
      <pre><code>WHATSAPP_API_TOKEN=&lt;system-user token&gt;  WHATSAPP_PHONE_ID=&lt;phone id&gt;
WHATSAPP_VERIFY_TOKEN=&lt;your string&gt;     WHATSAPP_APP_SECRET=&lt;app secret&gt;</code></pre>
      <div class="call info"><div class="h">Known gap</div><p><code>wa_user → org</code> mapping is pending — replies/menus work; full per-org actions are limited until that table exists.</p></div>
    </div></div>

  <div class="prov"><div class="bar"><div><div class="nm">Razorpay — payments &amp; subscriptions</div><div class="vars">RAZORPAY_KEY_ID · _KEY_SECRET · _WEBHOOK_SECRET · _PLAN_STARTER/GROWTH/PRO</div></div><span class="pill req">To charge</span></div>
    <div class="body">
      <div class="powers"><strong>Powers</strong> the <code>billing</code> service + <code>/subscribe</code> (7-day trial, UPI/card autopay). Without it billing degrades to "trial active".</div>
      <ol class="steps">
        <li>Sign up + KYC at <a>dashboard.razorpay.com</a> (Test mode first).</li>
        <li>Settings → <strong>API Keys</strong> → Generate → copy Key ID + Secret.</li>
        <li>Subscriptions → <strong>Plans</strong> → one plan per tier → copy each <code>plan_id</code>.</li>
        <li>Settings → <strong>Webhooks</strong> → URL <code>https://api.vertofi.com/api/v1/billing/webhook/razorpay</code>, set a secret, subscribe to <code>subscription.authenticated/charged/halted/pending/cancelled</code> + <code>payment.captured</code>.</li>
      </ol>
      <pre><code>RAZORPAY_KEY_ID=rzp_live_xxxx   RAZORPAY_KEY_SECRET=&lt;secret&gt;   RAZORPAY_WEBHOOK_SECRET=&lt;yours&gt;
RAZORPAY_PLAN_STARTER=plan_xxxx  RAZORPAY_PLAN_GROWTH=plan_xxxx  RAZORPAY_PLAN_PRO=plan_xxxx</code></pre>
      <div class="grid2"><div class="mini"><div class="lab">Verify</div>Test mandate on /subscribe flips billing → Celebration screen</div><div class="mini"><div class="lab">Place</div>Backend (webhook path is public in the gateway)</div></div>
    </div></div>

  <div class="grid2">
    <div class="prov"><div class="bar"><div><div class="nm">GST GSP</div><div class="vars">GST_GSP_BASE_URL · _CLIENT_ID · _CLIENT_SECRET</div></div><span class="pill opt">Optional</span></div>
      <div class="body"><div class="powers">gst-connector. Blank → offline structural GSTIN validation only.</div>
        <p>Pick a GSP (e.g. <strong>Masters India</strong> <a>mastersindia.co/gst-api</a>), onboard, get client creds + base URL (sandbox first).</p>
        <pre><code>GST_GSP_BASE_URL=https://api.mastersindia.co
GST_GSP_CLIENT_ID=…  GST_GSP_CLIENT_SECRET=…</code></pre></div></div>
    <div class="prov"><div class="bar"><div><div class="nm">Account Aggregator (Setu)</div><div class="vars">AA_BASE_URL · _CLIENT_ID · _CLIENT_SECRET</div></div><span class="pill opt">Optional</span></div>
      <div class="body"><div class="powers">bank-connector (RBI AA framework). Blank → empty state.</div>
        <p>Use an AA gateway (e.g. <strong>Setu</strong> <a>setu.co/data/account-aggregator</a>); onboard for sandbox then prod creds.</p>
        <pre><code>AA_BASE_URL=https://fiu-sandbox.setu.co
AA_CLIENT_ID=…  AA_CLIENT_SECRET=…</code></pre></div></div>
  </div>

  <div class="card">
    <h3 class="sub">Accounting-sync targets <span class="pill opt">Optional</span> &nbsp;·&nbsp; Verification connectors <span class="pill opt">Optional</span></h3>
    <div class="grid2">
      <div><strong>Zoho Books</strong> — <a>api-console.zoho.in</a> → Server-based client → <code>ZOHO_CLIENT_ID/SECRET</code>.<br>
        <strong>QuickBooks</strong> — <a>developer.intuit.com</a> → app keys → <code>QBO_CLIENT_ID/SECRET</code>.<br>
        <strong>Tally</strong> — <code>TALLY_CONNECTOR_URL=http://&lt;tally-host&gt;:9000</code>.</div>
      <div>verification-connectors (stubs): <code>PAYROLL_API_KEY</code>, <code>CREDIT_BUREAU_API_KEY</code>, <code>MCA_API_KEY</code>. Blank → <code>NEEDS_CREDENTIALS</code>.<br><br>
        <strong>Admin-console extras:</strong> <code>GITHUB_TOKEN</code> + <code>GITHUB_REPO</code> (Actions tab, fine-grained PAT, Actions:Read) and <code>NEXT_PUBLIC_GRAFANA_URL</code> (Vercel, web-admin).</div>
    </div>
  </div>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">4</div><div><div class="part-kicker">Target C</div><div class="part-title">Frontend (Vercel) variables</div></div></div>
  <p>Set per Vercel project (Settings → Environment Variables, Production). These are build-time <code>NEXT_PUBLIC_*</code> — public by design, never secrets. <strong>Redeploy</strong> after changing them.</p>
  <table class="t">
    <tr><th>Variable</th><th>Value</th><th>Projects</th></tr>
    <tr><td><code>NEXT_PUBLIC_API_URL</code></td><td>https://api.vertofi.com/api/v1</td><td><strong>all 8</strong></td></tr>
    <tr><td><code>NEXT_PUBLIC_BUSINESS_URL</code></td><td>https://business.vertofi.com</td><td>web-landing</td></tr>
    <tr><td><code>NEXT_PUBLIC_ASSOCIATES_URL</code></td><td>https://associates.vertofi.com</td><td>web-landing</td></tr>
    <tr><td><code>NEXT_PUBLIC_ACCOUNTANTS_URL</code></td><td>https://accountants.vertofi.com</td><td>web-landing</td></tr>
    <tr><td><code>NEXT_PUBLIC_BHS_URL</code></td><td>https://bhs.vertofi.com</td><td>web-landing</td></tr>
    <tr><td><code>NEXT_PUBLIC_LEGAL_URL</code></td><td>https://legal.vertofi.com</td><td>web-landing</td></tr>
    <tr><td><code>NEXT_PUBLIC_GRAFANA_URL</code></td><td>https://grafana.… (optional)</td><td>web-admin</td></tr>
  </table>
  <div class="call warn"><div class="h">CORS must match</div><p>The backend <code>CORS_ORIGINS</code> must list every domain above or the browser gets CORS errors.</p></div>
  <pre><code>CORS_ORIGINS=https://vertofi.com,https://www.vertofi.com,https://business.vertofi.com,
https://associates.vertofi.com,https://accountants.vertofi.com,https://bhs.vertofi.com,
https://legal.vertofi.com,https://admin.vertofi.com,https://teams.vertofi.com
RATE_LIMIT_PER_MIN=600</code></pre>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">5</div><div><div class="part-kicker">The exact commands</div><div class="part-title">Placement mechanics</div></div></div>

  <h2 class="sec">5.1 · Local development (A)</h2>
  <pre><code>Copy-Item .env.example .env       # fill DB/Redis/Kafka (docker), JWT secrets, OTP bypass
pnpm infra:up                     # Postgres/Redis/Redpanda/MinIO/OpenSearch
pnpm dev</code></pre>

  <h2 class="sec">5.2 · Production backend (B) → Secret Manager</h2>
  <pre><code>cd infra\gke
.\sync-secrets.ps1 -EnvFile ..\..\.env.production -ProjectId vertofi-prod-001
# single value by hand:
gcloud secrets create vertofi-shared-OPENAI_API_KEY --replication-policy=automatic --project vertofi-prod-001
"sk-proj-xxxx" | gcloud secrets versions add vertofi-shared-OPENAI_API_KEY --data-file=- --project vertofi-prod-001
# apply now:
kubectl rollout restart deployment --all -n vertofi-identity   # repeat per namespace</code></pre>

  <h2 class="sec">5.3 · Production frontend (C) → Vercel</h2>
  <pre><code>vercel env add NEXT_PUBLIC_API_URL production      # per project, see Part 4
vercel redeploy --target production
# after adding a Vercel domain, update CORS_ORIGINS (5.2) then:
kubectl rollout restart deployment api-gateway -n vertofi-gateway</code></pre>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">6</div><div><div class="part-kicker">At a glance</div><div class="part-title">Master matrix &amp; minimum-to-boot</div></div></div>
  <table class="t">
    <tr><th style="width:34%">Variable(s)</th><th style="width:22%">Source</th><th style="width:12%">Target</th><th style="width:14%">Required</th><th>Powers</th></tr>
    <tr><td>DATABASE_URL · DB_SSL</td><td>Cloud SQL</td><td>B</td><td><span class="pill hard">Hard</span></td><td>everything</td></tr>
    <tr><td>REDIS_URL</td><td>Memorystore</td><td>B</td><td><span class="pill hard">Hard</span></td><td>sessions/cache/metering</td></tr>
    <tr><td>KAFKA_* (5)</td><td>Confluent</td><td>B</td><td><span class="pill hard">Hard</span></td><td>event pipeline</td></tr>
    <tr><td>S3_* (6)</td><td>GCS + HMAC</td><td>B</td><td><span class="pill hard">Hard</span></td><td>document storage</td></tr>
    <tr><td>JWT_ACCESS/REFRESH_SECRET (+TTL)</td><td>generated</td><td>B</td><td><span class="pill hard">Hard</span></td><td>auth tokens</td></tr>
    <tr><td>APP_FIELD_KEY</td><td>generated</td><td>B</td><td><span class="pill hard">Hard</span></td><td>field encryption</td></tr>
    <tr><td>CORS_ORIGINS · RATE_LIMIT_PER_MIN</td><td>—</td><td>B</td><td><span class="pill hard">Hard</span></td><td>gateway</td></tr>
    <tr><td>OTP_BYPASS_ENABLED/CODE</td><td>generated</td><td>B</td><td><span class="pill temp">Temp</span></td><td>break-glass login</td></tr>
    <tr><td>SMTP_* (5)</td><td>Workspace/ESP</td><td>B</td><td><span class="pill req">Login*</span></td><td>email OTP + notifications</td></tr>
    <tr><td>MSG91_* (3)</td><td>MSG91</td><td>B</td><td><span class="pill req">Login*</span></td><td>SMS OTP</td></tr>
    <tr><td>OPENAI_API_KEY (+rate)</td><td>OpenAI</td><td>B</td><td><span class="pill req">Rec.</span></td><td>all AI</td></tr>
    <tr><td>GOOGLE_VISION_KEY</td><td>GCP / WI</td><td>B</td><td><span class="pill req">Rec.</span></td><td>OCR</td></tr>
    <tr><td>RAZORPAY_* (6)</td><td>Razorpay</td><td>B</td><td><span class="pill req">Charge</span></td><td>billing/subscriptions</td></tr>
    <tr><td>WHATSAPP_* · GST_GSP_* · AA_* · ZOHO/QBO/TALLY · PAYROLL/CREDIT/MCA · GEMINI · GITHUB_*</td><td>respective</td><td>B</td><td><span class="pill opt">Optional</span></td><td>degrade to empty state</td></tr>
    <tr><td>NEXT_PUBLIC_API_URL (+ landing URLs)</td><td>—</td><td>C</td><td><span class="pill hard">Hard</span></td><td>frontends → gateway</td></tr>
  </table>
  <div class="legend"><span>* need at least one of SMTP / MSG91 (or break-glass) to log in.</span></div>

  <div class="call tip"><div class="h">Absolute minimum to boot &amp; log in (pilot)</div>
    <p>1 — Core infra: DATABASE_URL, DB_SSL, REDIS_URL, all KAFKA_*, all S3_*. &nbsp; 2 — Generated: JWT × 2, APP_FIELD_KEY. &nbsp; 3 — Gateway: CORS_ORIGINS. &nbsp; 4 — Login: SMTP_* <em>or</em> MSG91_* (or OTP_BYPASS). &nbsp; 5 — Frontend: NEXT_PUBLIC_API_URL (+ landing URLs). Everything else is incremental.</p></div>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">7</div><div><div class="part-kicker">Prove it works</div><div class="part-title">Verification playbook</div></div></div>
  <pre><code># 1 gateway up + public health
curl -s https://api.vertofi.com/health                       # {"status":"ok"}
# 2 login entrypoint (public path)
curl -s -X POST https://api.vertofi.com/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"channel":"EMAIL","destination":"you@example.com","purpose":"LOGIN"}'   # 202 {challengeId}
# 3 CORS for a frontend origin
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS https://api.vertofi.com/api/v1/auth/otp/send \
  -H "Origin: https://business.vertofi.com" -H "Access-Control-Request-Method: POST"   # 204 + ACAO
# 4 protected route needs a token
curl -s -o /dev/null -w "%{http_code}\n" https://api.vertofi.com/api/v1/accounting/x   # 401</code></pre>
  <div class="grid2">
    <div class="mini"><div class="lab">In the apps</div>OTP arrives · invoice upload extracts (Vision) · "Ask Vertofi" drafts (OpenAI) · /subscribe test mandate flips billing · WhatsApp replies.</div>
    <div class="mini"><div class="lab">Pod-level</div><code>kubectl get pods -A</code> all Running · <code>kubectl logs deploy/auth -n vertofi-identity</code> no "missing env" · <code>kubectl get externalsecret -A</code> SecretSynced=True.</div>
  </div>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">8</div><div><div class="part-kicker">Keep it safe</div><div class="part-title">Rotation &amp; incident response</div></div></div>
  <ul class="clean">
    <li><strong>Rotate</strong>: add a new Secret Manager version → restart consumers (<code>kubectl rollout restart deployment --all -n &lt;ns&gt;</code>).</li>
    <li><strong>JWT rotation</strong> invalidates all sessions (everyone re-logs in) — do it in a window; rotate access + refresh together.</li>
    <li><strong>Provider keys</strong> (Razorpay/GST/AA/WhatsApp): revoke the old key in the dashboard after the new one is live.</li>
    <li><strong>Leak</strong> (log/screenshot/chat): revoke at the provider immediately, add a new version, restart.</li>
    <li><code>APP_FIELD_KEY</code> rotation requires re-encrypting existing encrypted columns — plan carefully.</li>
    <li>First hardening step post-launch: disable break-glass (<code>OTP_BYPASS_ENABLED=0</code>).</li>
    <li>Track owner + expiry per key (OpenAI project keys, Meta tokens, GSP creds expire).</li>
  </ul>
</div>

<div class="part">
  <div class="part-head"><div class="part-num">9</div><div><div class="part-kicker">Quick answers</div><div class="part-title">FAQ &amp; troubleshooting</div></div></div>
  <div class="card"><strong>Set a secret but the service still says missing?</strong><br>ESO hasn't synced or the pod wasn't restarted. Check <code>kubectl get externalsecret -A</code> (SecretSynced=True) and rollout-restart the service.</div>
  <div class="card"><strong>Browser shows a CORS error?</strong><br>The origin isn't in <code>CORS_ORIGINS</code>. Add it, re-run sync-secrets, restart api-gateway.</div>
  <div class="card"><strong>Login OTP never arrives?</strong><br>Neither SMTP nor MSG91 is working. Email → check DKIM/SPF + app password. SMS → DLT template/sender must be approved. Stopgap: break-glass.</div>
  <div class="card"><strong>Razorpay webhook not updating billing?</strong><br>URL must be the public path <code>/api/v1/billing/webhook/razorpay</code> and <code>RAZORPAY_WEBHOOK_SECRET</code> must match the dashboard exactly.</div>
  <div class="card"><strong>Documents always go to "review"?</strong><br><code>GOOGLE_VISION_KEY</code> blank and Workload Identity not granted Vision. Configure one path (§3.2).</div>
  <div class="card"><strong>Run with no AI key?</strong><br>Yes — categorization uses deterministic rules, AI-draft is off; platform still works.</div>
  <div class="card"><strong>Where do <code>NEXT_PUBLIC_*</code> go?</strong><br>Vercel (C). Public, build-time. Never a real secret behind that prefix.</div>

  <div class="lead" style="margin-top:16px;text-align:center;color:#475569">
    <strong style="color:var(--navy)">End of guide.</strong> &nbsp; Keep this file internal. Update it whenever a new connector or variable lands in <code>.env.example</code> / <code>.env.production.example</code>.
  </div>
</div>
