export const maxDuration = 300;

function renderHtmlPortal(timestamp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vertofi — Predictive Financial Intelligence Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(255, 255, 255, 0.04);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.35);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 50% 0%, #172554 0%, var(--bg) 75%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .container {
      max-width: 860px;
      width: 100%;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    h1 {
      font-size: clamp(32px, 5vw, 48px);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      font-size: clamp(15px, 2vw, 18px);
      color: var(--text-muted);
      max-width: 620px;
      margin: 0 auto 36px;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 36px;
      text-align: left;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 22px;
      backdrop-filter: blur(12px);
      transition: all 0.25s ease;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card:hover {
      transform: translateY(-3px);
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px var(--accent-glow);
    }
    .card-icon {
      font-size: 24px;
      margin-bottom: 12px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .status-bar {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 20px;
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-value {
      color: #38bdf8;
      font-weight: 600;
      font-family: monospace;
    }
    footer {
      margin-top: 24px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">
      <div class="badge-dot"></div>
      Vertofi Operational Gateway Active
    </div>

    <h1>Accounting that Thinks.<br>Predicts. Protects.</h1>
    <p class="subtitle">
      Predictive Financial Intelligence Platform automating accounting, monitoring GST compliance, and empowering business decisions.
    </p>

    <div class="grid">
      <a href="/workspace" class="card">
        <div>
          <div class="card-icon">⚡</div>
          <div class="card-title">Client Workspace</div>
          <div class="card-desc">Access proforma invoices, automated bank reconciliation, and business ledgers.</div>
        </div>
      </a>
      <a href="/dashboard" class="card">
        <div>
          <div class="card-icon">📊</div>
          <div class="card-title">Financial Dashboard</div>
          <div class="card-desc">Real-time revenue metrics, expense forecasting, and cash flow intelligence.</div>
        </div>
      </a>
      <a href="/templates" class="card">
        <div>
          <div class="card-icon">📄</div>
          <div class="card-title">Document Templates</div>
          <div class="card-desc">Custom GST & non-GST invoice engine with automated PDF generation.</div>
        </div>
      </a>
      <a href="/login" class="card">
        <div>
          <div class="card-icon">🔐</div>
          <div class="card-title">Platform Login</div>
          <div class="card-desc">Sign in with your verified credentials or enterprise SSO access.</div>
        </div>
      </a>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span>Gateway:</span>
        <span class="status-value">Ready (0ms latency)</span>
      </div>
      <div class="status-item">
        <span>Max Execution:</span>
        <span class="status-value">300 seconds</span>
      </div>
      <div class="status-item">
        <span>Active Instance:</span>
        <span class="status-value">${timestamp}</span>
      </div>
    </div>

    <footer>
      &copy; ${new Date().getFullYear()} Vertofi Solutions. All rights reserved.
    </footer>
  </div>
</body>
</html>`;
}

export default function handler(req: any, res: any) {
  const url = req.url || "";
  const headers = req.headers || {};
  const accept = headers.accept || headers.Accept || "";

  // 1. Fast immediate response for favicons and crawlers
  if (url.includes("favicon") || url.includes("robots.txt")) {
    if (res && typeof res.end === "function") {
      res.statusCode = 204;
      res.end();
      return;
    }
    return new Response(null, { status: 204 });
  }

  const timestamp = new Date().toISOString();

  // 2. Browser request asking for HTML: serve interactive portal
  if (typeof accept === "string" && accept.includes("text/html")) {
    const html = renderHtmlPortal(timestamp);
    if (res && typeof res.end === "function") {
      if (typeof res.setHeader === "function") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
      res.statusCode = 200;
      res.end(html);
      return;
    }
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate"
      }
    });
  }

  // 3. API / JSON payload
  const payload = {
    status: "online",
    name: "Vertofi Platform API",
    message: "Vertofi Platform Gateway active with 0ms latency.",
    timestamp
  };

  // Node.js Serverless Function (req, res): MUST return void
  if (res && typeof res.end === "function") {
    if (typeof res.setHeader === "function") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
    }
    if (typeof res.status === "function" && typeof res.json === "function") {
      res.status(200).json(payload);
      return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
    return;
  }

  // Web Standard Request/Response (Edge runtime)
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

export function GET(req: any, res: any) {
  return handler(req, res);
}

export function POST(req: any, res: any) {
  return handler(req, res);
}

export function OPTIONS(req: any, res: any) {
  if (res && typeof res.end === "function") {
    if (typeof res.setHeader === "function") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
    }
    res.statusCode = 204;
    res.end();
    return;
  }
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
