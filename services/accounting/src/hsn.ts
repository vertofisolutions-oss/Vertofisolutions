/**
 * HSN/SAC auto-detection.
 *
 * HSN (goods) and SAC (services) codes are a public, standardized classification
 * system — so a curated keyword table is real reference data, not fabricated
 * business data. We resolve deterministically first (org catalog → curated
 * table), then fall back to an AI *suggestion* the user reviews. Results are
 * always marked with their source so callers can show how confident to be.
 */

export interface HsnSuggestion {
  hsn: string;
  gstRate: number; // %
  description: string;
  source: "CATALOG" | "REFERENCE" | "AI";
  confidence: "high" | "medium" | "low";
}

/**
 * Curated common HSN/SAC reference for Indian MSMEs (keyword → code + GST rate).
 * Ordered most-specific first; matched as case-insensitive substrings. This is a
 * pragmatic starter set — the AI fallback covers the long tail, and items can
 * always be overridden by the user.
 */
const REFERENCE: { kw: string[]; hsn: string; gstRate: number; description: string }[] = [
  { kw: ["rice", "basmati"], hsn: "1006", gstRate: 5, description: "Rice" },
  { kw: ["wheat", "atta", "flour"], hsn: "1101", gstRate: 5, description: "Wheat / flour" },
  { kw: ["sugar"], hsn: "1701", gstRate: 5, description: "Sugar" },
  { kw: ["tea"], hsn: "0902", gstRate: 5, description: "Tea" },
  { kw: ["coffee"], hsn: "0901", gstRate: 5, description: "Coffee" },
  { kw: ["milk", "curd", "dairy"], hsn: "0401", gstRate: 5, description: "Milk and dairy" },
  { kw: ["biscuit", "cookie"], hsn: "1905", gstRate: 18, description: "Biscuits / bakery" },
  { kw: ["chocolate"], hsn: "1806", gstRate: 18, description: "Chocolate" },
  { kw: ["namkeen", "snack", "chips"], hsn: "2106", gstRate: 12, description: "Namkeen / snacks" },
  { kw: ["water bottle", "mineral water", "packaged water"], hsn: "2201", gstRate: 18, description: "Packaged water" },
  { kw: ["soft drink", "cold drink", "aerated"], hsn: "2202", gstRate: 28, description: "Aerated / soft drinks" },
  { kw: ["soap"], hsn: "3401", gstRate: 18, description: "Soap" },
  { kw: ["shampoo", "cosmetic", "lotion"], hsn: "3304", gstRate: 18, description: "Cosmetics / toiletries" },
  { kw: ["toothpaste"], hsn: "3306", gstRate: 18, description: "Toothpaste / oral care" },
  { kw: ["medicine", "tablet", "syrup", "pharma", "drug"], hsn: "3004", gstRate: 12, description: "Medicaments" },
  { kw: ["cement"], hsn: "2523", gstRate: 28, description: "Cement" },
  { kw: ["steel", "tmt", "iron rod", "rebar"], hsn: "7214", gstRate: 18, description: "Iron / steel bars" },
  { kw: ["paint"], hsn: "3208", gstRate: 18, description: "Paints and varnishes" },
  { kw: ["plywood", "timber", "wood"], hsn: "4412", gstRate: 18, description: "Plywood / wood" },
  { kw: ["plastic"], hsn: "3926", gstRate: 18, description: "Plastic articles" },
  { kw: ["paper", "notebook", "stationery"], hsn: "4820", gstRate: 18, description: "Paper stationery" },
  { kw: ["furniture", "chair", "table", "desk"], hsn: "9403", gstRate: 18, description: "Furniture" },
  { kw: ["mobile", "smartphone", "phone"], hsn: "8517", gstRate: 18, description: "Mobile phones" },
  { kw: ["laptop", "computer", "desktop"], hsn: "8471", gstRate: 18, description: "Computers / laptops" },
  { kw: ["charger", "adapter", "cable"], hsn: "8504", gstRate: 18, description: "Chargers / adapters" },
  { kw: ["led", "bulb", "light", "lamp"], hsn: "9405", gstRate: 12, description: "Lamps / lighting" },
  { kw: ["fan"], hsn: "8414", gstRate: 18, description: "Electric fans" },
  { kw: ["shoe", "footwear", "sandal", "slipper"], hsn: "6403", gstRate: 18, description: "Footwear" },
  { kw: ["shirt", "t-shirt", "apparel", "garment", "clothing", "saree", "kurta"], hsn: "6109", gstRate: 5, description: "Apparel" },
  { kw: ["fabric", "cloth", "textile"], hsn: "5208", gstRate: 5, description: "Textiles / fabric" },
  { kw: ["tyre", "tube"], hsn: "4011", gstRate: 28, description: "Tyres" },
  { kw: ["battery"], hsn: "8507", gstRate: 28, description: "Batteries" },
  // ── Services (SAC) ──
  { kw: ["consult", "advisory", "professional service"], hsn: "9983", gstRate: 18, description: "Professional / consulting services" },
  { kw: ["repair", "maintenance", "service charge"], hsn: "9987", gstRate: 18, description: "Maintenance / repair services" },
  { kw: ["transport", "freight", "logistics", "delivery"], hsn: "9965", gstRate: 5, description: "Goods transport" },
  { kw: ["software", "saas", "license", "subscription"], hsn: "997331", gstRate: 18, description: "Software / IT services" },
  { kw: ["rent", "lease", "rental"], hsn: "9972", gstRate: 18, description: "Real estate / rental services" },
  { kw: ["catering", "restaurant", "food service"], hsn: "9963", gstRate: 5, description: "Catering / restaurant services" },
  { kw: ["design", "marketing", "advertising", "branding"], hsn: "9983", gstRate: 18, description: "Advertising / design services" },
  { kw: ["labour", "labor", "manpower", "staffing"], hsn: "9985", gstRate: 18, description: "Manpower / support services" },
];

/** Deterministic resolve from the curated reference table. Null when nothing matches. */
export function resolveHsnFromReference(name: string): HsnSuggestion | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  for (const r of REFERENCE) {
    if (r.kw.some((k) => n.includes(k))) {
      return { hsn: r.hsn, gstRate: r.gstRate, description: r.description, source: "REFERENCE", confidence: "medium" };
    }
  }
  return null;
}

/**
 * AI-assisted HSN suggestion via the ai-gateway. Returns null on any failure or
 * when AI is unavailable — the caller then degrades honestly (no guessed code).
 */
export async function suggestHsnWithAi(aiUrl: string, name: string, orgId: string, plan?: string): Promise<HsnSuggestion | null> {
  const prompt =
    `You are an Indian GST classification assistant. For the product/service "${name}", ` +
    `return the most likely 4-to-8 digit HSN (goods) or SAC (services) code and its standard GST rate. ` +
    `Return ONLY JSON {"hsn":"","gstRate":0,"description":""}. If unsure, return {"hsn":"","gstRate":0,"description":""}.`;
  try {
    const res = await fetch(`${aiUrl}/ai/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "analyze", org_id: orgId, plan, json: true, prompt }),
    });
    const body = (await res.json()) as { degraded?: boolean; content?: { hsn?: string; gstRate?: number; description?: string } };
    const hsn = body.content?.hsn?.trim();
    if (body.degraded || !hsn || !/^\d{4,8}$/.test(hsn)) return null;
    return {
      hsn,
      gstRate: Number(body.content?.gstRate) || 18,
      description: body.content?.description?.trim() || name,
      source: "AI",
      confidence: "low",
    };
  } catch {
    return null;
  }
}
