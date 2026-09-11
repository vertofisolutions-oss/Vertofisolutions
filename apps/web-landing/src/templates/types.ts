export type TemplateCategory =
  | "All"
  | "Invoices"
  | "Quotations"
  | "Receipts"
  | "Billing"
  | "Subscriptions"
  | "HR"
  | "Finance"
  | "Business"
  | "Reports";

export type TierBadge = "Free" | "Premium";

export interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  hsnSac?: string;
  quantity: number;
  rate: number;
  discountPct: number;
  taxPct: number; // e.g. 18 for 18% GST
  total: number;
}

export interface PayslipEarning {
  id: string;
  label: string;
  amount: number;
}

export interface PayslipDeduction {
  id: string;
  label: string;
  amount: number;
}

export interface ClientStatementEntry {
  id: string;
  date: string;
  invoiceNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface DocumentFormData {
  // Theme & Styling
  primaryColor: string;
  secondaryColor: string;
  themePreset: "Vertofi Modern" | "Vertofi Professional" | "Vertofi Minimal" | "Vertofi Corporate" | "Vertofi Elegant";
  logoUrl?: string;

  // Company Information
  companyName: string;
  companyTagline?: string;
  companyAddress: string;
  companyCityState: string;
  companyEmail: string;
  companyPhone: string;
  companyGstin: string;
  companyPan: string;

  // Customer / Recipient Information
  customerName: string;
  customerCompany: string;
  customerAddress: string;
  customerCityState: string;
  customerEmail: string;
  customerPhone: string;
  customerGstin: string;

  // Document Metadata
  docNumber: string;
  docDate: string;
  dueDate?: string;
  validUntilDate?: string;
  placeOfSupply?: string;
  billingPeriod?: string;
  subscriptionPlan?: string;
  numberOfUsers?: number;
  preparedBy?: string;
  projectName?: string;
  projectDescription?: string;

  // Items / Services
  items?: TemplateItem[];

  // Tax & Discount Summary
  discountOverallPct?: number;
  shippingCharges?: number;
  extraCharges?: number;

  // Payment Details
  paymentMethod?: string;
  transactionId?: string;
  paymentStatus?: "PAID" | "UNPAID" | "PARTIAL" | "OVERDUE" | "PENDING";
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  showUpiQr?: boolean;

  // Terms & Signatures
  termsAndConditions?: string;
  notes?: string;
  signatoryTitle?: string;

  // HR / Payslip Specific Fields
  employeeName?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  payPeriod?: string;
  workingDays?: number;
  presentDays?: number;
  leaveDays?: number;
  paidDays?: number;
  earnings?: PayslipEarning[];
  deductions?: PayslipDeduction[];

  // Experience Certificate Specific Fields
  lastWorkingDate?: string;
  issueDate?: string;

  // Client Statement Specific Fields
  statementPeriod?: string;
  openingBalance?: number;
  statementEntries?: ClientStatementEntry[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  slug: string;
  category: TemplateCategory;
  description: string;
  tier: TierBadge;
  popularity: number; // 1-100 for sorting
  isNew?: boolean;
  features: string[];
  paperSize: "A4" | "Letter";
  defaultFormData: DocumentFormData;
}

export interface SavedDocument {
  id: string;
  templateId: string;
  templateName: string;
  category: TemplateCategory;
  docNumber: string;
  recipientName: string;
  amount: number;
  updatedAt: string;
  formData: DocumentFormData;
}
