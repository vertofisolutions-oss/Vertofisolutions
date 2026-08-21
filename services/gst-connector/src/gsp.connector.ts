import { Injectable } from "@nestjs/common";
import { Connector, EnvCredentialVault, retry, type ConnectorMeta } from "@vertofi/connectors";

/** Validate GSTIN structure (15 chars) — a cheap real check independent of GSP. */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isStructurallyValidGstin(gstin: string): boolean {
  return GSTIN_RE.test(gstin);
}

/**
 * GST state codes — the first two digits of every GSTIN. This is a fixed public
 * standard (not provider data), so we can derive the state offline and reliably.
 */
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman and Diu", "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
  "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction",
};

/** Validate the GSTIN check digit (15th char) — the official mod-36 algorithm. */
export function hasValidGstinChecksum(gstin: string): boolean {
  if (!GSTIN_RE.test(gstin)) return false;
  const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = ALPHA.indexOf(gstin[i]!);
    const factor = i % 2 === 0 ? 1 : 2;
    const p = v * factor;
    sum += Math.floor(p / 36) + (p % 36);
  }
  const checkChar = ALPHA[(36 - (sum % 36)) % 36];
  return checkChar === gstin[14];
}

/** A normalized taxpayer profile — the shape every caller (web, WhatsApp, registration) consumes. */
export interface GstinProfile {
  gstin: string;
  structurallyValid: boolean;
  checksumValid: boolean;
  /** Always derivable offline from the GSTIN itself. */
  stateCode: string;
  state: string | null;
  pan: string | null;
  /** Populated only when the GSP connector is ACTIVE (never fabricated). */
  legalName?: string;
  tradeName?: string;
  constitution?: string; // business type / constitution of business
  status?: string; // Active / Cancelled / Suspended
  taxpayerType?: string; // Regular / Composition / etc.
  registrationDate?: string;
  natureOfBusiness?: string[];
  address?: { line?: string; city?: string; state?: string; pincode?: string };
  centreJurisdiction?: string;
  stateJurisdiction?: string;
  eInvoiceEnabled?: boolean;
  /** Connector status so the UI can show an honest "add GSP key to enrich" state. */
  source: "DETERMINISTIC" | "GSP";
  connector: string;
}

/** Deterministic, offline extraction encoded inside the GSTIN itself (state + PAN). */
export function extractFromGstin(gstin: string): Pick<GstinProfile, "gstin" | "structurallyValid" | "checksumValid" | "stateCode" | "state" | "pan"> {
  const g = gstin.trim().toUpperCase();
  const structurallyValid = isStructurallyValidGstin(g);
  const stateCode = g.slice(0, 2);
  // PAN of the registrant is embedded at positions 3-12 (0-indexed 2..11).
  const pan = structurallyValid ? g.slice(2, 12) : null;
  return {
    gstin: g,
    structurallyValid,
    checksumValid: structurallyValid && hasValidGstinChecksum(g),
    stateCode,
    state: GST_STATE_CODES[stateCode] ?? null,
    pan,
  };
}

/**
 * GST Suvidha Provider connector (Masters India etc.) — docs/09.
 * NEEDS_CREDENTIALS until GSP partnership keys exist. Structural GSTIN
 * validation works offline; filing-status / vendor-risk pulls require the GSP
 * and are never faked.
 */
@Injectable()
export class GspConnector extends Connector {
  private readonly vault = new EnvCredentialVault();

  /** Appyflow GST verification API base (public-taxpayer search). */
  private readonly appyflowBase = process.env.GST_APPYFLOW_BASE_URL ?? "https://appyflow.in/api/verifyGST";

  constructor() {
    const meta: ConnectorMeta = {
      id: "gst.gsp",
      category: "gst",
      provider: process.env.GST_APPYFLOW_KEY ? "Appyflow (GST API)" : "GSP (Masters India)",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    };
    super(meta);
  }

  /** True when the Appyflow key is configured → use its public-taxpayer API. */
  private usingAppyflow(): boolean {
    return this.vault.has("GST_APPYFLOW_KEY");
  }

  hasCredentials(): boolean {
    return this.usingAppyflow() || this.vault.has("GST_GSP_BASE_URL", "GST_GSP_CLIENT_ID", "GST_GSP_CLIENT_SECRET");
  }

  /**
   * Call Appyflow's verifyGST endpoint → the raw `taxpayerInfo` object (the same
   * GSTIN field names our adapter already reads). Throws on Appyflow errors so
   * the caller can degrade to the deterministic profile.
   */
  private async fetchAppyflow(gstin: string): Promise<Record<string, unknown>> {
    const key = this.vault.get("GST_APPYFLOW_KEY")!;
    const url = `${this.appyflowBase}?gstNo=${encodeURIComponent(gstin)}&key_secret=${encodeURIComponent(key)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`appyflow_http_${res.status}`);
    const body = (await res.json()) as { error?: boolean; message?: string; taxpayerInfo?: Record<string, unknown> };
    if (body.error || !body.taxpayerInfo) throw new Error(`appyflow_${(body.message ?? "no_taxpayer_info").toString().slice(0, 60)}`);
    return body.taxpayerInfo;
  }

  async verifyVendor(gstin: string): Promise<{
    gstin: string;
    structurallyValid: boolean;
    connector: string;
    filingStatus?: string;
    riskScore?: number;
  }> {
    const structurallyValid = isStructurallyValidGstin(gstin);
    if (this.status() !== "ACTIVE") {
      return { gstin, structurallyValid, connector: this.status() };
    }
    if (this.usingAppyflow()) {
      return retry(async () => {
        const info = await this.fetchAppyflow(gstin);
        // GSTIN status (Active/Cancelled/Suspended) is the real "filing health" signal.
        return { gstin, structurallyValid, connector: "ACTIVE", filingStatus: (info.sts as string) ?? undefined };
      });
    }
    const base = this.vault.get("GST_GSP_BASE_URL")!;
    return retry(async () => {
      const res = await fetch(`${base}/taxpayer/${gstin}`, {
        headers: { "client-id": this.vault.get("GST_GSP_CLIENT_ID")! },
      });
      if (!res.ok) throw new Error(`gsp_http_${res.status}`);
      const data = (await res.json()) as { filingStatus?: string; riskScore?: number };
      return { gstin, structurallyValid, connector: "ACTIVE", ...data };
    });
  }

  /**
   * Full taxpayer lookup → a normalized {@link GstinProfile}. State + PAN are
   * always derived offline from the GSTIN. Legal/trade name, address, status and
   * jurisdiction are pulled from the GSP only when credentials exist — never
   * fabricated. Powers registration autofill, invoice biller autofill (web +
   * WhatsApp) and customer/vendor onboarding.
   */
  async lookupTaxpayer(gstin: string): Promise<GstinProfile> {
    const base = extractFromGstin(gstin);
    if (this.status() !== "ACTIVE") {
      return { ...base, source: "DETERMINISTIC", connector: this.status() };
    }
    // Appyflow path — its taxpayerInfo uses the same GSTN field names.
    if (this.usingAppyflow()) {
      try {
        return await retry(async () => this.normalizeTaxpayer(base, await this.fetchAppyflow(base.gstin)));
      } catch {
        return { ...base, source: "DETERMINISTIC", connector: "DEGRADED" };
      }
    }
    const apiBase = this.vault.get("GST_GSP_BASE_URL")!;
    try {
      return await retry(async () => {
        const res = await fetch(`${apiBase}/taxpayer/${base.gstin}`, {
          headers: { "client-id": this.vault.get("GST_GSP_CLIENT_ID")! },
        });
        if (!res.ok) throw new Error(`gsp_http_${res.status}`);
        const raw = (await res.json()) as Record<string, unknown>;
        return this.normalizeTaxpayer(base, raw);
      });
    } catch {
      // GSP unreachable → still return the honest deterministic profile.
      return { ...base, source: "DETERMINISTIC", connector: "DEGRADED" };
    }
  }

  /**
   * Adapter: maps a GSP taxpayer payload onto our normalized shape. GSPs differ
   * (Masters India, ClearTax, …) so we read several common field aliases. Adding
   * a new GSP later is an edit here, not a rewrite of every caller.
   */
  private normalizeTaxpayer(
    base: Pick<GstinProfile, "gstin" | "structurallyValid" | "checksumValid" | "stateCode" | "state" | "pan">,
    raw: Record<string, unknown>,
  ): GstinProfile {
    const pick = (...keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = raw[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return undefined;
    };
    const pradr = (raw.pradr ?? raw.principalAddress) as Record<string, unknown> | undefined;
    const addr = (pradr?.addr ?? pradr) as Record<string, unknown> | undefined;
    const nba = (raw.nba ?? raw.natureOfBusiness) as unknown;
    return {
      ...base,
      legalName: pick("lgnm", "legalName", "tradeNam"),
      tradeName: pick("tradeNam", "tradeName", "tradeNm"),
      constitution: pick("ctb", "constitution", "constitutionOfBusiness"),
      status: pick("sts", "status", "gstinStatus"),
      taxpayerType: pick("dty", "taxpayerType", "taxPayerType"),
      registrationDate: pick("rgdt", "registrationDate"),
      natureOfBusiness: Array.isArray(nba) ? (nba as string[]) : undefined,
      address: addr
        ? {
            line: [addr.bno, addr.bnm, addr.st, addr.loc].filter(Boolean).join(", ") || undefined,
            city: (addr.dst ?? addr.city) as string | undefined,
            state: (addr.stcd ?? addr.state) as string | undefined,
            pincode: (addr.pncd ?? addr.pincode) as string | undefined,
          }
        : undefined,
      centreJurisdiction: pick("ctj", "centreJurisdiction", "ctjCd"),
      stateJurisdiction: pick("stj", "stateJurisdiction", "stjCd"),
      eInvoiceEnabled: raw.einvoiceStatus === "Yes" || raw.eInvoiceEnabled === true || undefined,
      source: "GSP",
      connector: "ACTIVE",
    };
  }

  /**
   * Generate an e-Invoice IRN (Invoice Reference Number) + signed QR via the IRP
   * through the GSP. Returns the connector status when credentials are missing —
   * never a fabricated IRN.
   */
  async generateEInvoice(invoice: Record<string, unknown>): Promise<{ connector: string; irn?: string; qr?: string }> {
    if (this.status() !== "ACTIVE") return { connector: this.status() };
    const base = this.vault.get("GST_GSP_BASE_URL")!;
    return retry(async () => {
      const res = await fetch(`${base}/einvoice/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "client-id": this.vault.get("GST_GSP_CLIENT_ID")! },
        body: JSON.stringify(invoice),
      });
      if (!res.ok) throw new Error(`einvoice_http_${res.status}`);
      const data = (await res.json()) as { irn?: string; signedQrCode?: string };
      return { connector: "ACTIVE", irn: data.irn, qr: data.signedQrCode };
    });
  }

  /** Generate an e-Way Bill (EWB) number via the GSP. */
  async generateEwayBill(invoice: Record<string, unknown>): Promise<{ connector: string; ewbNo?: string; validUpto?: string }> {
    if (this.status() !== "ACTIVE") return { connector: this.status() };
    const base = this.vault.get("GST_GSP_BASE_URL")!;
    return retry(async () => {
      const res = await fetch(`${base}/ewaybill/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "client-id": this.vault.get("GST_GSP_CLIENT_ID")! },
        body: JSON.stringify(invoice),
      });
      if (!res.ok) throw new Error(`ewaybill_http_${res.status}`);
      const data = (await res.json()) as { ewbNo?: string; validUpto?: string };
      return { connector: "ACTIVE", ewbNo: data.ewbNo, validUpto: data.validUpto };
    });
  }
}
