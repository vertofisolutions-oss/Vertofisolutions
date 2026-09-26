import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { category, details } = body;

    // Simulate 3-5 seconds of AI Triage processing (as required by PDF 10-second SLA)
    await new Promise((resolve) => setTimeout(resolve, 3500));

    let priority = "Priority 3";
    let threatLevel = "Low";
    let deadlineSeverity = "None";
    let penalty = "₹0";
    let legalInvolvement = "Not required based on current assessment";
    let assignedExpert = "Support Coordinator";
    let requiredDocs: string[] = [];

    // Triage Rule Engine based on Category
    if (category === "GST") {
      priority = details?.noticeType?.includes("Demand") || details?.amount > 50000 ? "Priority 1" : "Priority 2";
      threatLevel = priority === "Priority 1" ? "High (Demand/Show Cause)" : "Medium";
      deadlineSeverity = details?.dueDate ? `Due in ${Math.ceil((new Date(details.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days` : "Unknown";
      penalty = details?.amount ? `Up to ₹${details.amount} + interest` : "Unknown";
      legalInvolvement = priority === "Priority 1" ? "Recommended" : "Not required based on current assessment";
      assignedExpert = "GST Specialist";
      requiredDocs = ["Complete Notice PDF", "GSTR-3B for relevant period", "GSTR-2B for relevant period"];
    } 
    else if (category === "Income Tax") {
      priority = "Priority 1";
      threatLevel = "High";
      deadlineSeverity = details?.dueDate ? `Due in ${Math.ceil((new Date(details.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days` : "Action Required Immediately";
      penalty = "Varies based on assessment";
      legalInvolvement = "Required/review needed";
      assignedExpert = "CA / Tax Expert";
      requiredDocs = ["Complete IT Notice", "ITR Acknowledgment", "Computation of Income"];
    }
    else if (category === "TDS") {
      priority = "Priority 2";
      threatLevel = "Medium";
      penalty = "Late filing fees + 1% to 1.5% interest per month";
      legalInvolvement = "Not required based on current assessment";
      assignedExpert = "CA / Tax Expert";
      requiredDocs = ["26AS / AIS", "TDS Returns filed", "Challan details"];
    }
    else if (category === "Cashflow") {
      priority = "Priority 1";
      threatLevel = "Critical Liquidity Event";
      penalty = "Risk of default";
      legalInvolvement = "Not required based on current assessment";
      assignedExpert = "CFO Desk";
      requiredDocs = ["Latest Bank Statement", "List of immediate payables", "List of expected receivables"];
    }
    else if (category === "Fraud") {
      priority = "Priority 1";
      threatLevel = "Severe (Internal/External Fraud)";
      penalty = "Financial Loss / Liability";
      legalInvolvement = "Required/review needed";
      assignedExpert = "Forensic Auditor";
      requiredDocs = ["Suspicious Invoices", "Bank statements", "Communication logs"];
    }
    else if (category === "Vendor/Client Dispute") {
      priority = "Priority 2";
      threatLevel = "Medium (Commercial Dispute)";
      legalInvolvement = "Recommended";
      assignedExpert = "Arbitration / Legal Advisor";
      requiredDocs = ["Original Contract/PO", "Disputed Invoice", "Email threads"];
    }
    else if (category === "Payroll") {
      priority = "Priority 2";
      threatLevel = "Medium";
      penalty = "PF/ESI compliance risk";
      assignedExpert = "HR / Payroll Specialist";
      requiredDocs = ["Payroll Register", "Attendance logs", "Employee complaint (if any)"];
    }
    else {
      priority = "Priority 3";
      threatLevel = "Standard Evaluation";
      assignedExpert = "Senior Analyst";
      requiredDocs = ["Any relevant correspondence", "Supporting financial records"];
    }

    const triageResult = {
      priority,
      threatLevel,
      deadlineSeverity,
      penalty,
      legalInvolvement,
      assignedExpert,
      requiredDocs,
      triageCompletedAt: new Date().toISOString()
    };

    return NextResponse.json({ success: true, triage: triageResult }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Triage engine failed" }, { status: 500 });
  }
}
