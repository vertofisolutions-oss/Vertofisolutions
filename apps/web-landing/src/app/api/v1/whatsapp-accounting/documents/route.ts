import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Generate robust mock data for the Document Vault & Approval Workflow
  const documents = [
    {
      id: "INV-201000",
      type: "Sales Invoice",
      client: "XYZ Buyer",
      amount: "₹6,045.00",
      date: "May 27th, 2026",
      status: "Pending Approval",
      trigger: "WhatsApp Text: 'Create invoice for XYZ Buyer - 5,200 + Tax'",
      documentPreview: "Sales Invoice PDF Generated. Includes GST slab applied automatically.",
      syncStatus: "Pending Tally Sync"
    },
    {
      id: "CRN-VTF-021",
      type: "Credit Note",
      client: "Global Tech",
      amount: "₹3,000.00",
      date: "Today",
      status: "Approved",
      trigger: "WhatsApp Text: 'Return invoice #VTF-021 - 3,000 damaged goods'",
      documentPreview: "GST-compliant Credit Note generated.",
      syncStatus: "Synced to Zoho Books"
    },
    {
      id: "DBN-405",
      type: "Debit Note",
      client: "Global Tech",
      amount: "₹1,200.00",
      date: "Yesterday",
      status: "Approved",
      trigger: "WhatsApp Text: 'Add transport charge ₹1,200 to invoice VTF-021'",
      documentPreview: "Debit Note generated. Receivables adjusted.",
      syncStatus: "Synced to Zoho Books"
    },
    {
      id: "REC-992",
      type: "Receipt Voucher",
      client: "ABC Corporation",
      amount: "₹50,000.00",
      date: "Yesterday",
      status: "Pending Approval",
      trigger: "WhatsApp Voice: 'Received 50,000 advance from ABC'",
      documentPreview: "Receipt Voucher generated. Linked to Customer.",
      syncStatus: "Pending Approval"
    },
    {
      id: "PRO-311",
      type: "Proforma Invoice",
      client: "NextGen Retails",
      amount: "₹15,000.00",
      date: "Oct 12th, 2026",
      status: "Pending Approval",
      trigger: "WhatsApp Text: 'Send quote to NextGen Retails for 15k'",
      documentPreview: "Proforma Invoice PDF Generated.",
      syncStatus: "Not Applicable"
    }
  ];

  return NextResponse.json({ success: true, documents }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
