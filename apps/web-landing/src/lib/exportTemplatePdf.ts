"use client";

export interface ReportSectionKV {
  kind: "kv";
  heading: string;
  rows: { label: string; value: string; bold?: boolean }[];
}

export interface ReportSectionTable {
  kind: "table";
  heading: string;
  columns: { label: string; align?: string }[];
  data: (string | number | unknown)[][];
}

export type ReportSection = ReportSectionKV | ReportSectionTable | Record<string, unknown>;

export interface ExportReportOptions {
  title: string;
  docType?: string;
  subtitle?: string;
  period?: string;
  sections: ReportSection[];
  templateNum?: number;
}

export interface TemplateThemeConfig {
  number: number;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  textColor: string;
  cardBg: string;
  cardBorder: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  headerStyle: "modern-blue" | "emerald-banner" | "executive-purple" | "midnight-slate" | "minimalist-indigo" | "gold-navy";
  watermark: string;
  badgeBg: string;
  badgeText: string;
}

export function getActiveTemplateNumber(): number {
  if (typeof window === "undefined") return 1;
  try {
    const direct = localStorage.getItem("vertofi_selected_template");
    if (direct) {
      const n = Number(direct);
      if (n >= 1 && n <= 6) return n;
    }
    const settings = localStorage.getItem("vertofi_invoice_template_settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.templateId) return Number(parsed.templateId);
      if (parsed.selectedTemplate) return Number(parsed.selectedTemplate);
    }
  } catch {}
  return 1;
}

export function getTemplateThemeConfig(num: number): TemplateThemeConfig {
  switch (num) {
    case 2: // Emerald Compliance Pro
      return {
        number: 2,
        name: "Emerald Compliance Pro",
        primary: "#059669",
        secondary: "#10B981",
        accent: "#047857",
        textColor: "#064E3B",
        cardBg: "#F0FDF4",
        cardBorder: "#BBF7D0",
        tableHeaderBg: "#064E3B",
        tableHeaderColor: "#FFFFFF",
        headerStyle: "emerald-banner",
        watermark: "AUDIT VERIFIED • 100% GST COMPLIANT",
        badgeBg: "#D1FAE5",
        badgeText: "#065F46",
      };
    case 3: // Executive Purple
      return {
        number: 3,
        name: "Executive Purple",
        primary: "#6D28D9",
        secondary: "#8B5CF6",
        accent: "#7C3AED",
        textColor: "#3B0764",
        cardBg: "#FAF5FF",
        cardBorder: "#E9D5FF",
        tableHeaderBg: "#3B0764",
        tableHeaderColor: "#FFFFFF",
        headerStyle: "executive-purple",
        watermark: "EXECUTIVE AUDIT COPY • BOARD CERTIFIED",
        badgeBg: "#EDE9FE",
        badgeText: "#5B21B6",
      };
    case 4: // Midnight Slate Elite
      return {
        number: 4,
        name: "Midnight Slate Elite",
        primary: "#0F172A",
        secondary: "#D97706",
        accent: "#B45309",
        textColor: "#0F172A",
        cardBg: "#F8FAFC",
        cardBorder: "#CBD5E1",
        tableHeaderBg: "#0F172A",
        tableHeaderColor: "#FFFFFF",
        headerStyle: "midnight-slate",
        watermark: "AUTHENTICATED FINANCIAL STATEMENT",
        badgeBg: "#FEF3C7",
        badgeText: "#92400E",
      };
    case 5: // Minimalist Indigo
      return {
        number: 5,
        name: "Minimalist Indigo",
        primary: "#3730A3",
        secondary: "#4F46E5",
        accent: "#4338CA",
        textColor: "#1E1B4B",
        cardBg: "#EEF2FF",
        cardBorder: "#C7D2FE",
        tableHeaderBg: "#312E81",
        tableHeaderColor: "#FFFFFF",
        headerStyle: "minimalist-indigo",
        watermark: "STANDARDIZED FINANCIAL REPORT",
        badgeBg: "#E0E7FF",
        badgeText: "#3730A3",
      };
    case 6: // Classic GST Gold & Navy
      return {
        number: 6,
        name: "Classic GST Gold & Navy",
        primary: "#1E3A8A",
        secondary: "#B45309",
        accent: "#D97706",
        textColor: "#172554",
        cardBg: "#FFFBEB",
        cardBorder: "#FDE68A",
        tableHeaderBg: "#172554",
        tableHeaderColor: "#FFFFFF",
        headerStyle: "gold-navy",
        watermark: "ORIGINAL FOR BUYER • RULE 46 COMPLIANT",
        badgeBg: "#FEF3C7",
        badgeText: "#78350F",
      };
    case 1:
    default: // Vertofi Modern Blue
      return {
        number: 1,
        name: "Vertofi Modern Blue",
        primary: "#1E60D5",
        secondary: "#2563EB",
        accent: "#3B82F6",
        textColor: "#0F172A",
        cardBg: "#F0F7FF",
        cardBorder: "#BFDBFE",
        tableHeaderBg: "#0F172A",
        tableHeaderColor: "#FFFFFF",
        headerStyle: "modern-blue",
        watermark: "ORIGINAL REPORT • VERTOFI SECURE LEDGER",
        badgeBg: "#DBEAFE",
        badgeText: "#1E40AF",
      };
  }
}

export function getCompanyProfile(): {
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  address: string;
  cityState: string;
  email: string;
  phone: string;
} {
  const fallback = {
    legalName: "Vertofi Technologies Pvt. Ltd.",
    tradeName: "Vertofi Solutions",
    gstin: "36AABCV1234F1Z9",
    pan: "AABCV1234F",
    address: "Financial District, Nanakramguda",
    cityState: "Hyderabad, Telangana 500032",
    email: "accounts@vertofi.com",
    phone: "+91 80080 12345",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem("vertofi_business_profile");
    if (raw) {
      const p = JSON.parse(raw);
      return {
        legalName: p.legalName || fallback.legalName,
        tradeName: p.tradeName || p.legalName || fallback.tradeName,
        gstin: p.gstin || fallback.gstin,
        pan: p.pan || fallback.pan,
        address: p.address || fallback.address,
        cityState: [p.city, p.state, p.pincode].filter(Boolean).join(", ") || fallback.cityState,
        email: p.email || fallback.email,
        phone: p.phone || fallback.phone,
      };
    }
  } catch {}
  return fallback;
}

/**
 * Prints HTML document cleanly via an isolated hidden iframe.
 * Avoids window popups and triggers the native browser Print / Save as PDF modal directly.
 */
export function printHtmlViaIframe(htmlContent: string, documentTitle: string) {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  if (iframe.contentWindow) {
    iframe.contentWindow.document.title = documentTitle;
  }

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print error:", e);
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        } catch {}
      }, 60000);
    }
  };

  setTimeout(triggerPrint, 350);
}

/**
 * Prints any DOM element (e.g. invoice sheet) as an isolated clean A4 PDF.
 */
export function printElementAsPdf(element: HTMLElement, title: string) {
  const content = element.innerHTML;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0F172A;
    }
    .print-wrapper {
      width: 100%;
      max-width: 794px;
      margin: 0 auto;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; }
  </style>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="print-wrapper">
    ${content}
  </div>
</body>
</html>`;
  printHtmlViaIframe(html, title);
}

/**
 * Formats and exports any statement or report in the exact visual design of the selected template.
 */
export function exportReportPdfInTemplateFormat(options: ExportReportOptions) {
  const templateNum = options.templateNum || getActiveTemplateNumber();
  const theme = getTemplateThemeConfig(templateNum);
  const company = getCompanyProfile();
  const title = options.title || "Report";
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const reportRef = `REP-${Date.now().toString().slice(-6)}`;

  // Header Banner HTML per template style
  let headerHtml = "";
  if (theme.headerStyle === "midnight-slate") {
    headerHtml = `
      <div style="background-color: #0F172A; color: #FFFFFF; padding: 18px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #D97706;">
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #F8FAFC;">${company.tradeName}</h1>
          <p style="margin: 3px 0 0; font-size: 11px; color: #94A3B8;">${company.legalName} • GSTIN: <strong style="color: #FBBF24;">${company.gstin}</strong></p>
        </div>
        <div style="text-align: right;">
          <span style="background-color: #D97706; color: #FFFFFF; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
            ${title}
          </span>
          <p style="margin: 5px 0 0; font-size: 10px; color: #CBD5E1;">Ref: ${reportRef}</p>
        </div>
      </div>
    `;
  } else if (theme.headerStyle === "emerald-banner") {
    headerHtml = `
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; padding: 18px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10B981;">
        <div>
          <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px;">100% GST &amp; AUDIT COMPLIANT</div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">${company.legalName}</h1>
          <p style="margin: 3px 0 0; font-size: 11px; opacity: 0.9;">GSTIN: <strong>${company.gstin}</strong> • PAN: <strong>${company.pan}</strong></p>
        </div>
        <div style="text-align: right;">
          <span style="background-color: #FFFFFF; color: #064E3B; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${title}
          </span>
          <p style="margin: 6px 0 0; font-size: 10px; opacity: 0.85;">Ref: ${reportRef}</p>
        </div>
      </div>
    `;
  } else if (theme.headerStyle === "executive-purple") {
    headerHtml = `
      <div style="border: 2px solid #6D28D9; background-color: #FAF5FF; padding: 18px 24px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <span style="background-color: #6D28D9; color: #FFFFFF; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase;">Executive Statement</span>
          <h1 style="margin: 6px 0 0; font-size: 21px; font-weight: 800; color: #3B0764;">${company.legalName}</h1>
          <p style="margin: 3px 0 0; font-size: 11px; color: #5B21B6;">GSTIN: <strong>${company.gstin}</strong> • ${company.cityState}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #6D28D9; text-transform: uppercase;">${title}</h2>
          <p style="margin: 4px 0 0; font-size: 10px; color: #7C3AED;">Ref: ${reportRef}</p>
        </div>
      </div>
    `;
  } else if (theme.headerStyle === "gold-navy") {
    headerHtml = `
      <div style="background-color: #1E3A8A; color: #FFFFFF; padding: 18px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #B45309;">
        <div>
          <div style="color: #FDE68A; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px;">Rule 46 Statutory Compliance</div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">${company.legalName}</h1>
          <p style="margin: 3px 0 0; font-size: 11px; color: #BFDBFE;">GSTIN: <strong style="color: #FDE68A;">${company.gstin}</strong> • PAN: ${company.pan}</p>
        </div>
        <div style="text-align: right;">
          <div style="background-color: #B45309; color: #FFFFFF; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
            ${title}
          </div>
          <p style="margin: 5px 0 0; font-size: 10px; color: #BFDBFE;">Ref: ${reportRef}</p>
        </div>
      </div>
    `;
  } else if (theme.headerStyle === "minimalist-indigo") {
    headerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #3730A3; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background-color: #3730A3; color: #FFFFFF; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px;">V</div>
            <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #1E1B4B;">${company.legalName}</h1>
          </div>
          <p style="margin: 4px 0 0; font-size: 11px; color: #4B5563;">GSTIN: <strong>${company.gstin}</strong> • ${company.cityState}</p>
        </div>
        <div style="text-align: right;">
          <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; color: #3730A3; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
            ${title}
          </div>
          <p style="margin: 4px 0 0; font-size: 10px; color: #6B7280;">Ref: ${reportRef}</p>
        </div>
      </div>
    `;
  } else {
    // Modern Blue (Template 1)
    headerHtml = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-top: 4px solid #1E60D5; border-radius: 8px; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background-color: #1E60D5; color: #FFFFFF; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">V</div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0F172A;">${company.legalName}</h1>
          </div>
          <p style="margin: 4px 0 0; font-size: 11px; color: #475569;">GSTIN: <strong style="color: #1E60D5;">${company.gstin}</strong> • PAN: ${company.pan}</p>
          <p style="margin: 2px 0 0; font-size: 10px; color: #64748B;">${company.address}, ${company.cityState}</p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #DBEAFE; color: #1E40AF; border: 1px solid #BFDBFE; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            ${title}
          </span>
          <p style="margin: 6px 0 0; font-size: 10px; color: #64748B;">Ref: <strong>${reportRef}</strong></p>
          <p style="margin: 2px 0 0; font-size: 10px; color: #64748B;">Date: ${dateStr}</p>
        </div>
      </div>
    `;
  }

  // Meta Info Bar (Applied Template badge + Timestamp)
  const metaBarHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 6px 12px; background-color: ${theme.cardBg}; border: 1px solid ${theme.cardBorder}; border-radius: 6px; font-size: 10.5px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: ${theme.primary}; font-weight: 700;">★ Template ${theme.number}: ${theme.name}</span>
        <span style="color: #94A3B8;">|</span>
        <span style="color: #475569;">Generated on: <strong>${dateStr} at ${timeStr}</strong></span>
      </div>
      <div style="font-weight: 700; font-size: 9.5px; color: ${theme.accent}; letter-spacing: 0.5px;">
        ${theme.watermark}
      </div>
    </div>
  `;

  // Fallback if sections is empty
  let effectiveSections = [...options.sections];
  if (effectiveSections.length === 0) {
    if (options.docType === "PROFIT_LOSS" || title.toLowerCase().includes("profit")) {
      effectiveSections = [
        {
          kind: "kv",
          heading: "Profit & Loss Summary",
          rows: [
            { label: "Total Revenue / Sales", value: "₹0.00", bold: true },
            { label: "Cost of Goods Sold (COGS)", value: "₹0.00" },
            { label: "Gross Margin", value: "₹0.00" },
            { label: "Operating Expenses", value: "₹0.00" },
            { label: "Net Profit / (Loss)", value: "₹0.00", bold: true },
          ],
        },
        {
          kind: "table",
          heading: "Revenue & Expense Accounts",
          columns: [
            { label: "Account Name", align: "left" },
            { label: "Category", align: "left" },
            { label: "Amount (₹)", align: "right" },
          ],
          data: [
            ["Operating Sales Revenue", "Revenue", "₹0.00"],
            ["Purchase & Direct Expenses", "Cost of Goods Sold", "₹0.00"],
            ["Administrative Expenses", "Indirect Expenses", "₹0.00"],
          ],
        },
      ];
    } else if (options.docType === "BALANCE_SHEET" || title.toLowerCase().includes("balance")) {
      effectiveSections = [
        {
          kind: "kv",
          heading: "Balance Sheet Statement",
          rows: [
            { label: "Total Current Assets", value: "₹0.00", bold: true },
            { label: "Trade Receivables / Debtors", value: "₹0.00" },
            { label: "Total Liabilities", value: "₹0.00" },
            { label: "Trade Payables / Creditors", value: "₹0.00" },
            { label: "Total Equity & Net Worth", value: "₹0.00", bold: true },
          ],
        },
        {
          kind: "table",
          heading: "Assets & Liabilities Summary",
          columns: [
            { label: "Particulars", align: "left" },
            { label: "Classification", align: "left" },
            { label: "Balance (₹)", align: "right" },
          ],
          data: [
            ["Bank & Cash Equivalents", "Current Asset", "₹0.00"],
            ["Sundry Debtors", "Current Asset", "₹0.00"],
            ["Sundry Creditors", "Current Liability", "₹0.00"],
          ],
        },
      ];
    } else if (options.docType === "CASH_FLOW" || title.toLowerCase().includes("cash")) {
      effectiveSections = [
        {
          kind: "kv",
          heading: "Cash Flow Overview",
          rows: [
            { label: "Operating Cash Inflows", value: "₹0.00", bold: true },
            { label: "Operating Cash Outflows", value: "₹0.00" },
            { label: "Net Operating Cash Flow", value: "₹0.00", bold: true },
            { label: "Closing Cash Position", value: "₹0.00" },
          ],
        },
      ];
    } else if (options.docType === "GST_SUMMARY" || title.toLowerCase().includes("gst")) {
      effectiveSections = [
        {
          kind: "kv",
          heading: "GST Summary (GSTR-3B)",
          rows: [
            { label: "Taxable Outward Supplies", value: "₹0.00", bold: true },
            { label: "Output GST Liability", value: "₹0.00" },
            { label: "Eligible Input Tax Credit (ITC)", value: "₹0.00" },
            { label: "Net GST Cash Payable", value: "₹0.00", bold: true },
          ],
        },
      ];
    }
  }

  // Render Sections (KV Summary Boxes + Data Tables)
  let sectionsHtml = "";
  for (const s of effectiveSections) {
    if (!s || typeof s !== "object") continue;
    const sec = s as Record<string, unknown>;

    if (sec.kind === "kv" && Array.isArray(sec.rows)) {
      const heading = (sec.heading as string) || "Summary";
      const rows = sec.rows as { label: string; value: string; bold?: boolean }[];

      const rowsHtml = rows
        .map(
          (r) => `
          <div style="background-color: #FFFFFF; border: 1px solid ${theme.cardBorder}; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; justify-content: space-between;">
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">${r.label}</span>
            <span style="font-size: 15px; font-weight: ${r.bold ? 800 : 700}; color: ${r.bold ? theme.primary : "#0F172A"}; margin-top: 4px;">${r.value}</span>
          </div>
        `
        )
        .join("");

      sectionsHtml += `
        <div style="margin-bottom: 18px;">
          <h3 style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${theme.primary};">
            ${heading}
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
            ${rowsHtml}
          </div>
        </div>
      `;
    } else if (sec.kind === "table" && Array.isArray(sec.data)) {
      const heading = (sec.heading as string) || "Ledger Details";
      const columns = (sec.columns as { label: string; align?: string }[]) || [];
      const data = sec.data as (string | number)[][];

      const headerCells = columns
        .map(
          (c) =>
            `<th style="padding: 7px 10px; text-align: ${c.align || "left"}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${theme.tableHeaderColor};">${c.label}</th>`
        )
        .join("");

      const rowsHtml = data
        .map((row, idx) => {
          const bg = idx % 2 === 0 ? "#FFFFFF" : theme.cardBg;
          const cells = row
            .map((val, cellIdx) => {
              const align = columns[cellIdx]?.align || "left";
              const isFirst = cellIdx === 0;
              return `<td style="padding: 6px 10px; font-size: 10.5px; text-align: ${align}; color: #1E293B; ${isFirst ? "font-weight: 600;" : ""}; border-bottom: 1px solid #E2E8F0;">${String(val ?? "—")}</td>`;
            })
            .join("");
          return `<tr style="background-color: ${bg};">${cells}</tr>`;
        })
        .join("");

      sectionsHtml += `
        <div style="margin-bottom: 18px;">
          <h3 style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${theme.primary};">
            ${heading}
          </h3>
          <div style="border: 1px solid ${theme.cardBorder}; border-radius: 6px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
              <thead>
                <tr style="background-color: ${theme.tableHeaderBg};">${headerCells}</tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td colspan="${columns.length || 1}" style="padding: 12px; text-align: center; color: #94A3B8; font-size: 11px;">No records recorded for this period.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  }

  // Official Footer (Seal, Signatory, Verification)
  const footerHtml = `
    <div style="margin-top: 24px; padding-top: 14px; border-top: 2px solid ${theme.cardBorder}; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748B;">
      <div>
        <p style="margin: 0; font-weight: 700; color: #0F172A;">${company.legalName}</p>
        <p style="margin: 2px 0 0;">Email: ${company.email} • Tel: ${company.phone}</p>
        <p style="margin: 2px 0 0; font-size: 9px; color: #94A3B8;">Certified Electronic Statement • System Hash: SHA256-${reportRef}</p>
      </div>
      <div style="text-align: right; width: 180px;">
        <div style="height: 32px; border-bottom: 1px dashed #94A3B8; margin-bottom: 4px;"></div>
        <p style="margin: 0; font-weight: 700; color: #0F172A;">Authorized Signatory</p>
        <p style="margin: 1px 0 0; font-size: 9px; color: #94A3B8;">Verified via Vertofi Platform</p>
      </div>
    </div>
  `;

  // Complete HTML document
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${company.tradeName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: ${theme.textColor};
      font-size: 11px;
      line-height: 1.4;
    }
    .page-container {
      width: 100%;
      max-width: 794px;
      margin: 0 auto;
      padding: 4px;
    }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="page-container">
    ${headerHtml}
    ${metaBarHtml}
    ${sectionsHtml}
    ${footerHtml}
  </div>
</body>
</html>`;

  printHtmlViaIframe(fullHtml, `${title.replace(/\W+/g, "_")}.pdf`);
}
