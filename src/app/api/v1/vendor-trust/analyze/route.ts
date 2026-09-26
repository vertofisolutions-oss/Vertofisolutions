import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { vendorQuery } = body;

    if (!vendorQuery) {
      return NextResponse.json({ success: false, error: "Vendor query is required." }, { status: 400 });
    }

    // AI Simulation Core Processing (Mocked 2.5-second delay to simulate scraping)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // MOCK DATA GENERATOR: Depending on the input, generate a different score profile.
    const isBadVendor = vendorQuery.toLowerCase().includes("fraud") || vendorQuery.includes("999");
    const isMediocreVendor = vendorQuery.toLowerCase().includes("delay") || vendorQuery.includes("555");

    let score = 92;
    if (isBadVendor) score = 32;
    else if (isMediocreVendor) score = 65;

    let classification = "VERY SAFE VENDOR";
    let recommendation = "YES — Safe Vendor";
    if (score < 40) {
      classification = "DO NOT TRUST";
      recommendation = "NO — High Risk Vendor";
    } else if (score < 60) {
      classification = "RISKY VENDOR";
      recommendation = "NO — High Risk Vendor";
    } else if (score < 80) {
      classification = "STABLE VENDOR";
      recommendation = "YES — Safe Vendor (with precautions)";
    }

    const advice = score > 80 
      ? ["Vendor is safe for credit up to ₹50,000 monthly.", "Proceed with standard business terms."]
      : score > 60
      ? ["Take a partial deposit only.", "Monitor delivery timelines closely."]
      : score > 40
      ? ["Avoid advance payment.", "Ask for performance guarantee.", "Use milestone-based payments."]
      : ["DO NOT engage.", "High probability of financial loss.", "Halt all pending payments immediately."];

    const report = {
      vendorInfo: {
        name: vendorQuery.toUpperCase(),
        gstin: vendorQuery.match(/^[0-9A-Z]{15}$/) ? vendorQuery : "27XXXXX1234X1Z5",
        status: score > 40 ? "Active" : "Suspended",
        industry: "General Trading",
      },
      trustScore: score,
      classification,
      recommendation,
      advice,
      lastUpdated: new Date().toISOString().split('T')[0],
      pillars: {
        gst: {
          status: score > 60 ? "High Compliance" : score > 40 ? "Medium Compliance" : "Low Compliance",
          details: {
            onTime: score > 60 ? 12 : 8,
            late: score > 60 ? 0 : 3,
            missing: score > 40 ? 0 : 4,
            salesDrop: score < 60 ? "Detected (15% drop)" : "Stable",
            itcSpike: score < 40 ? "Red Flag - 40% Spike" : "Normal",
            mismatch: score < 40 ? "⚠ ₹45,000 difference in GSTR-1/3B" : "✓ Matched"
          }
        },
        legal: {
          status: score > 80 ? "No issues detected" : score > 40 ? "Minor disputes" : "High Risk",
          details: {
            openDisputes: score > 80 ? 0 : score > 40 ? 1 : 3,
            nclt: score < 40 ? "1 Active Proceeding" : "None detected",
            mcaHealth: score > 60 ? "Good" : "Review Required (ROC Notices)",
            chequeBounce: score < 40 ? 2 : 0
          }
        },
        payment: {
          status: score > 70 ? "Stable" : score > 40 ? "Watch" : "Red Alert",
          details: {
            onTimeRate: score > 80 ? "95%" : score > 50 ? "75%" : "40%",
            avgDelay: score > 80 ? "2 days" : score > 50 ? "14 days" : "45+ days (Chronic)",
            overdueInvoices: score > 60 ? 0 : 3
          }
        },
        financial: {
          status: score > 75 ? "Strong" : score > 45 ? "Moderate" : "Distressed",
          details: {
            yoySales: score > 50 ? "+12%" : "-25%",
            cashflow: score > 60 ? "Stable" : "Volatile / Negative periods detected",
            directorHistory: score < 40 ? "1 Resignation (Last 6 mo)" : "Stable"
          }
        },
        reliability: {
          status: score > 80 ? "Excellent" : score > 50 ? "Good" : "Poor",
          details: {
            onTimeDelivery: score > 80 ? "98%" : score > 50 ? "85%" : "60%",
            disputes: score > 60 ? 0 : 2,
            overbilling: score < 40 ? "Flagged (2 instances)" : "None detected"
          }
        },
        fraudRisk: {
          indicator: score > 80 ? "Low" : score > 60 ? "Moderate" : score > 40 ? "Elevated" : "HIGH",
          summary: score < 40 
            ? "Multiple red flags across GST, Legal, and Payment history indicate high probability of financial manipulation or default."
            : "No significant fraud signals detected based on available data."
        }
      }
    };

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Vendor Analysis Engine failed" }, { status: 500 });
  }
}
