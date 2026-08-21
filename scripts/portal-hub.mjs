import http from 'node:http';

const PORT = 8080;

const PORTALS = [
  { id: 'landing', name: 'Marketing & Landing', port: 3000, path: '/', icon: '??', tag: 'Public', desc: 'Main platform landing page, pricing, 15 features & contact' },
  { id: 'business', name: 'Business Client Portal', port: 3001, path: '/', icon: '??', tag: 'Client', desc: 'Business owner dashboard, onboarding, workspaces & subscription' },
  { id: 'associates', name: 'Associates Panel', port: 3002, path: '/', icon: '??', tag: 'Finance Pro', desc: 'CA / CMA / CS / CPA professional client review panel' },
  { id: 'admin', name: 'Admin Console', port: 3003, path: '/login', icon: '???', tag: 'Internal Staff', desc: 'Platform operations, tenant administration & security controls' },
  { id: 'accountants', name: 'Accountants Panel', port: 3004, path: '/', icon: '??', tag: 'Finance Pro', desc: 'Staff accountants and bookkeepers ledger management' },
  { id: 'bhs', name: 'BHS Intelligence', port: 3005, path: '/', icon: '??', tag: 'Intelligence', desc: 'Business Health Score analytics and diagnostic tools' },
  { id: 'legal', name: 'Legal Counsel', port: 3006, path: '/', icon: '??', tag: 'Legal', desc: 'Legal compliance, cases, disputes & contracts management' },
  { id: 'teams', name: 'Internal Teams', port: 3007, path: '/', icon: '??', tag: 'Internal Staff', desc: 'Operations workflows and team collaboration panel' }
];

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vertofi — Unified Portal Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 26, 43, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.25);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --header-bg: #0f172a;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* Topbar */
    header {
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .logo-badge {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.25rem;
      color: #fff;
      box-shadow: 0 0 20px var(--accent-glow);
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .brand-title span {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .view-toggles {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.25rem;
      border-radius: 8px;
      border: 1px solid var(--card-border);
    }

    .view-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-btn.active {
      background: #1e293b;
      color: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    /* Main Content */
    main {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    /* Sidebar Navigation */
    nav.sidebar {
      width: 320px;
      background: rgba(15, 23, 42, 0.75);
      border-right: 1px solid var(--card-border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 1rem;
      gap: 0.5rem;
    }

    .nav-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      margin: 0.5rem 0 0.25rem 0.5rem;
    }

    .portal-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.85rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      color: inherit;
    }

    .portal-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--card-border);
      transform: translateX(2px);
    }

    .portal-item.active {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.4);
    }

    .portal-icon {
      font-size: 1.35rem;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .portal-info {
      flex: 1;
      min-width: 0;
    }

    .portal-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .portal-port {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }

    .portal-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 0.2rem;
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      display: inline-block;
    }

    /* Content Area */
    .viewport-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #020617;
      position: relative;
    }

    .viewport-toolbar {
      padding: 0.6rem 1rem;
      background: rgba(15, 23, 42, 0.85);
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .url-bar {
      flex: 1;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 0.4rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .url-bar a {
      color: #38bdf8;
      text-decoration: none;
    }

    .url-bar a:hover { text-decoration: underline; }

    .action-btn {
      background: #1e293b;
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: #334155;
      border-color: rgba(255,255,255,0.2);
    }

    .action-btn.primary {
      background: #10b981;
      color: #022c22;
      border-color: #10b981;
    }

    .action-btn.primary:hover {
      background: #34d399;
    }

    iframe#portalFrame {
      flex: 1;
      width: 100%;
      height: 100%;
      border: none;
      background: #fff;
    }

    /* Grid View */
    .grid-container {
      display: none;
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      align-content: start;
    }

    .grid-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }

    .grid-card:hover {
      border-color: rgba(16, 185, 129, 0.4);
      transform: translateY(-3px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px -5px var(--accent-glow);
    }

    .grid-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .card-icon {
      font-size: 2rem;
      width: 52px;
      height: 52px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-tag {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.06);
      color: #94a3b8;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
    }

    .card-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.45;
      flex: 1;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      gap: 0.5rem;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="logo-badge">V</div>
      <div class="brand-title">
        Vertofi Platform Hub
        <span>Live System</span>
      </div>
    </div>

    <div class="view-toggles">
      <button class="view-btn active" id="btnEmbedView" onclick="setView('embed')">Embedded Viewer</button>
      <button class="view-btn" id="btnGridView" onclick="setView('grid')">Portal Grid</button>
    </div>
  </header>

  <main>
    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="nav-label">Select Portal</div>
      ${PORTALS.map((p, idx) => `
        <div class="portal-item ${idx === 0 ? 'active' : ''}" id="nav-${p.id}" onclick="selectPortal('${p.id}', ${p.port}, '${p.path}')">
          <div class="portal-icon">${p.icon}</div>
          <div class="portal-info">
            <div class="portal-name">
              <span>${p.name}</span>
              <span class="portal-port">:${p.port}</span>
            </div>
            <div class="portal-desc"><span class="live-dot"></span> ${p.tag}</div>
          </div>
        </div>
      `).join('')}
    </nav>

    <!-- Embedded View -->
    <div class="viewport-container" id="embedContainer">
      <div class="viewport-toolbar">
        <div class="url-bar">
          <span>?? HTTPS (Local):</span>
          <a id="currentUrlLink" href="http://localhost:3000" target="_blank">http://localhost:3000</a>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="action-btn" onclick="reloadFrame()">? Reload</button>
          <a class="action-btn primary" id="openExternalBtn" href="http://localhost:3000" target="_blank">? Open in Tab</a>
        </div>
      </div>
      <iframe id="portalFrame" src="http://localhost:3000"></iframe>
    </div>

    <!-- Grid View -->
    <div class="grid-container" id="gridContainer">
      ${PORTALS.map(p => `
        <div class="grid-card">
          <div class="grid-card-top">
            <div class="card-icon">${p.icon}</div>
            <span class="card-tag">${p.tag}</span>
          </div>
          <h3 class="card-title">${p.name}</h3>
          <p class="card-desc">${p.desc}</p>
          <div class="card-footer">
            <span class="portal-port">http://localhost:${p.port}</span>
            <div style="display: flex; gap: 0.4rem;">
              <button class="action-btn" onclick="selectPortal('${p.id}', ${p.port}, '${p.path}'); setView('embed')">Preview</button>
              <a class="action-btn primary" href="http://localhost:${p.port}${p.path}" target="_blank">Launch ?</a>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </main>

  <script>
    let currentPort = 3000;
    let currentPath = '/';

    function selectPortal(id, port, path) {
      currentPort = port;
      currentPath = path;
      document.querySelectorAll('.portal-item').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById('nav-' + id);
      if (activeEl) activeEl.classList.add('active');

      const url = 'http://localhost:' + port + path;
      document.getElementById('portalFrame').src = url;
      document.getElementById('currentUrlLink').href = url;
      document.getElementById('currentUrlLink').textContent = url;
      document.getElementById('openExternalBtn').href = url;
    }

    function reloadFrame() {
      const frame = document.getElementById('portalFrame');
      frame.src = frame.src;
    }

    function setView(mode) {
      const embedEl = document.getElementById('embedContainer');
      const gridEl = document.getElementById('gridContainer');
      const btnEmbed = document.getElementById('btnEmbedView');
      const btnGrid = document.getElementById('btnGridView');

      if (mode === 'embed') {
        embedEl.style.display = 'flex';
        gridEl.style.display = 'none';
        btnEmbed.classList.add('active');
        btnGrid.classList.remove('active');
      } else {
        embedEl.style.display = 'none';
        gridEl.style.display = 'grid';
        btnEmbed.classList.remove('active');
        btnGrid.classList.add('active');
      }
    }
  </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

server.listen(PORT, () => {
  console.log(`[Vertofi Hub] Unified Portal Hub running at http://localhost:${PORT}`);
});
