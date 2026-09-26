import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { industry, revenueBand, region, latitude, longitude, isNearby } = body;

    // Dynamic mock benchmark calculation based on nearby location & cohort
    const sampleSize = latitude && longitude ? 168 : (isNearby ? 154 : 142);
    const healthScore = industry === "Technology" ? 84 : industry === "Manufacturing" ? 76 : 78;

    const benchmarkData = {
      healthScore,
      sampleSize,
      location: region || (latitude && longitude ? `Nearby (${Number(latitude).toFixed(2)}°, ${Number(longitude).toFixed(2)}°)` : "Nearby Location"),
      metrics: [
        {
          id: "gross_margin",
          name: "Gross Margin %",
          yourBusiness: 28.4,
          median: 34.0,
          p25: 22.0,
          p75: 40.0,
          p90: 48.0,
          unit: "%",
          action: "Review COGS—negotiate supplier prices",
          category: "Profitability"
        },
        {
          id: "payroll_revenue",
          name: "Payroll / Revenue %",
          yourBusiness: 18.0,
          median: 12.5,
          p25: 9.0,
          p75: 16.0,
          p90: 22.0,
          unit: "%",
          action: "Consider contractor mix; hire freeze",
          category: "Cost Structure"
        },
        {
          id: "gst_output",
          name: "GST Output / Revenue %",
          yourBusiness: 3.6,
          median: 3.2,
          p25: 1.8,
          p75: 4.1,
          p90: 5.5,
          unit: "%",
          action: "Verify classification of GST on services",
          category: "GST"
        },
        {
          id: "rent_revenue",
          name: "Rent / Revenue %",
          yourBusiness: 14.0,
          median: 9.0,
          p25: 5.0,
          p75: 12.0,
          p90: 16.0,
          unit: "%",
          action: "Review lease terms or location costs",
          category: "Cost Structure"
        }
      ],
      recommendations: [
        {
          title: "Payroll burden is above peer median",
          description: "Your Payroll / Revenue is 18.0% compared to the industry median of 12.5%. Reviewing your contractor mix could yield significant savings.",
          estimatedImpact: "₹5,50,000 / year",
          metricId: "payroll_revenue"
        },
        {
          title: "Rent expense is an outlier",
          description: "Your Rent / Revenue is at the 88th percentile (above P75). Consider re-negotiating lease terms.",
          estimatedImpact: "₹2,40,000 / year",
          metricId: "rent_revenue"
        }
      ]
    };

    return NextResponse.json({ success: true, data: benchmarkData }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid Request" }, { status: 400 });
  }
}
