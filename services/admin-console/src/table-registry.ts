/**
 * Entity registry for the admin DB browser (docs/24).
 *
 * The admin may browse/edit ONLY the entities registered here, and only the
 * columns listed. Sensitive columns (password_hash, mfa_secret, code_hash,
 * encrypted blobs) are intentionally absent so they can never be selected or
 * returned — column-level security enforced at the application layer, on top of
 * the DB-level GRANTs in migrations/001_security.sql.
 *
 * `label` + `group` drive the admin sidebar: every entity is named and grouped
 * by domain (Organizations, Billing, Accounting, …) so the admin navigates by
 * business entity, not by raw schema.table.
 */
export interface TableDef {
  schema: string;
  table: string;
  pk: string;
  /** Friendly entity name shown in the sidebar/grid. */
  label: string;
  /** Sidebar domain group. */
  group: string;
  /** Columns the admin may read. */
  columns: string[];
  /** Columns the admin may update (subset of columns). */
  editable: string[];
  /** Column used for free-text search (ILIKE). */
  searchable?: string;
  /** Column used for ordering (defaults to created_at then pk). */
  orderBy?: string;
}

export const TABLES: Record<string, TableDef> = {
  // ── Organizations ──────────────────────────────────────────────────────
  organizations: {
    schema: "tenant", table: "organizations", pk: "id", label: "Organizations", group: "Organizations",
    columns: ["id", "public_id", "legal_name", "trade_name", "business_type", "industry", "gstin", "pan", "cin", "llpin", "udyam", "tan", "plan", "plan_status", "onboarding_stage", "onboarding_confidence", "created_at", "updated_at"],
    editable: ["legal_name", "trade_name", "business_type", "industry", "gstin", "pan", "cin", "llpin", "udyam", "tan", "plan", "plan_status"],
    searchable: "legal_name", orderBy: "created_at",
  },
  teams: {
    schema: "tenant", table: "teams", pk: "id", label: "Teams", group: "Organizations",
    columns: ["id", "name", "lead_user_id", "status", "created_by", "created_at"],
    editable: ["name", "lead_user_id", "status"], searchable: "name", orderBy: "created_at",
  },
  team_assignments: {
    schema: "tenant", table: "team_assignments", pk: "id", label: "Team ↔ Company", group: "Organizations",
    columns: ["id", "team_id", "org_id", "assigned_by", "created_at"], editable: [], orderBy: "created_at",
  },

  // ── Users & Access ─────────────────────────────────────────────────────
  users: {
    schema: "auth", table: "users", pk: "id", label: "Users", group: "Users & Access",
    // password_hash, mfa_secret deliberately excluded (column-level security).
    columns: ["id", "email", "mobile", "role", "professional_type", "org_id", "parent_associate_id", "plan", "status", "email_verified", "mobile_verified", "mfa_enabled", "last_login_at", "created_at"],
    editable: ["email", "mobile", "role", "professional_type", "status", "plan", "email_verified", "mobile_verified", "mfa_enabled"],
    searchable: "email", orderBy: "created_at",
  },
  sessions: {
    schema: "auth", table: "sessions", pk: "id", label: "Sessions", group: "Users & Access",
    columns: ["id", "user_id", "device_id", "ip", "user_agent", "created_at", "expires_at", "revoked_at"],
    editable: [], orderBy: "created_at",
  },
  access_grants: {
    schema: "access", table: "access_grants", pk: "id", label: "Access Grants", group: "Users & Access",
    columns: ["id", "grantee_type", "grantee_id", "org_id", "permission", "scope", "granted_by", "reason", "status", "expires_at", "created_at"],
    editable: ["permission", "scope", "status", "expires_at"], orderBy: "created_at",
  },
  access_requests: {
    schema: "access", table: "access_requests", pk: "id", label: "Access Requests", group: "Users & Access",
    columns: ["id", "requester_id", "org_id", "requested_permission", "reason", "status", "decided_by", "decided_at", "created_at"],
    editable: ["status"], orderBy: "created_at",
  },

  // ── Billing ────────────────────────────────────────────────────────────
  subscriptions: {
    schema: "billing", table: "subscriptions", pk: "id", label: "Subscriptions", group: "Billing",
    columns: ["id", "org_id", "plan", "period", "amount", "status", "trial_ends_at", "current_period_end", "gateway_ref", "razorpay_subscription_id", "mandate_status", "next_charge_at", "autopay_method", "created_at"],
    editable: ["plan", "period", "status", "trial_ends_at", "current_period_end", "mandate_status", "next_charge_at"], orderBy: "created_at",
  },
  payments: {
    schema: "billing", table: "payments", pk: "id", label: "Payments", group: "Billing",
    columns: ["id", "org_id", "gateway_ref", "amount", "status", "created_at"], editable: ["status"], orderBy: "created_at",
  },
  billing_profiles: {
    schema: "billing", table: "billing_profiles", pk: "org_id", label: "Billing Profiles", group: "Billing",
    columns: ["org_id", "legal_name", "gstin", "email", "phone", "address_line", "city", "state", "pincode", "created_at"],
    editable: ["legal_name", "gstin", "email", "phone", "address_line", "city", "state", "pincode"], searchable: "legal_name", orderBy: "created_at",
  },
  usage_counters: {
    schema: "billing", table: "usage_counters", pk: "id", label: "Usage Counters", group: "Billing",
    columns: ["id", "org_id", "metric", "period", "used", "limit_v"], editable: ["limit_v"], orderBy: "period",
  },

  // ── Accounting ─────────────────────────────────────────────────────────
  customers: {
    schema: "accounting", table: "customers", pk: "id", label: "Customers", group: "Accounting",
    columns: ["id", "org_id", "name", "gstin", "state", "address", "phone", "email", "created_at"],
    editable: ["name", "gstin", "state", "address", "phone", "email"], searchable: "name", orderBy: "created_at",
  },
  products: {
    schema: "accounting", table: "products", pk: "id", label: "Products", group: "Accounting",
    columns: ["id", "org_id", "name", "hsn", "unit", "rate", "tax_rate", "stock", "created_at"],
    editable: ["name", "hsn", "unit", "rate", "tax_rate", "stock"], searchable: "name", orderBy: "created_at",
  },
  sales_invoices: {
    schema: "accounting", table: "sales_invoices", pk: "id", label: "Sales Invoices", group: "Accounting",
    columns: ["id", "org_id", "invoice_no", "customer_name", "date", "taxable", "cgst", "sgst", "igst", "total", "status", "source", "created_at"],
    editable: ["status"], searchable: "invoice_no", orderBy: "date",
  },
  purchase_invoices: {
    schema: "accounting", table: "purchase_invoices", pk: "id", label: "Purchase Invoices", group: "Accounting",
    columns: ["id", "org_id", "bill_no", "vendor_name", "vendor_gstin", "date", "taxable", "cgst", "sgst", "igst", "total", "status", "source", "created_at"],
    editable: ["status"], searchable: "vendor_name", orderBy: "date",
  },
  inventory_movements: {
    schema: "accounting", table: "inventory_movements", pk: "id", label: "Inventory Movements", group: "Accounting",
    columns: ["id", "org_id", "product_id", "direction", "qty", "reason", "created_at"], editable: [], orderBy: "created_at",
  },

  // ── Ledger ─────────────────────────────────────────────────────────────
  chart_of_accounts: {
    schema: "ledger", table: "chart_of_accounts", pk: "id", label: "Chart of Accounts", group: "Ledger",
    columns: ["id", "org_id", "code", "name", "type", "created_at"], editable: ["code", "name", "type"], searchable: "name", orderBy: "code",
  },
  ledger_invoices: {
    schema: "ledger", table: "invoices", pk: "id", label: "Ledger Invoices", group: "Ledger",
    columns: ["id", "org_id", "direction", "invoice_no", "date", "taxable", "cgst", "sgst", "igst", "total", "itc_eligible", "status", "created_at"],
    editable: ["status"], searchable: "invoice_no", orderBy: "date",
  },
  ledger_entries: {
    schema: "ledger", table: "ledger_entries", pk: "id", label: "Ledger Entries", group: "Ledger",
    columns: ["id", "org_id", "txn_date", "narration", "source", "status", "posted_by", "created_at"],
    editable: ["status"], searchable: "narration", orderBy: "txn_date",
  },
  ledger_lines: {
    schema: "ledger", table: "ledger_lines", pk: "id", label: "Ledger Lines", group: "Ledger",
    columns: ["id", "entry_id", "org_id", "account_id", "debit", "credit"], editable: [], orderBy: "id",
  },

  // ── Documents ──────────────────────────────────────────────────────────
  documents: {
    schema: "document", table: "documents", pk: "id", label: "Documents", group: "Documents",
    columns: ["id", "org_id", "type", "filename", "content_type", "s3_key", "version", "status", "virus_scanned", "source", "linked_entity_type", "linked_entity_id", "uploaded_by", "created_at"],
    editable: ["type", "status"], searchable: "filename", orderBy: "created_at",
  },
  extractions: {
    schema: "ocr", table: "extractions", pk: "id", label: "OCR Extractions", group: "Documents",
    columns: ["id", "document_id", "org_id", "confidence", "status", "model_version", "created_at"], editable: ["status"], orderBy: "created_at",
  },

  // ── Intelligence ───────────────────────────────────────────────────────
  bhs_scores: {
    schema: "bhs", table: "bhs_scores", pk: "id", label: "Health Scores", group: "Intelligence",
    columns: ["id", "org_id", "score", "rating", "computed_at"], editable: [], orderBy: "computed_at",
  },
  predictions: {
    schema: "prediction", table: "predictions", pk: "id", label: "Predictions", group: "Intelligence",
    columns: ["id", "org_id", "type", "horizon", "confidence", "created_at"], editable: [], orderBy: "created_at",
  },
  profit_leaks: {
    schema: "prediction", table: "profit_leaks", pk: "id", label: "Profit Leaks", group: "Intelligence",
    columns: ["id", "org_id", "type", "amount", "status", "created_at"], editable: ["status"], orderBy: "created_at",
  },
  vendor_trust: {
    schema: "vendor", table: "vendor_trust", pk: "id", label: "Vendor Trust", group: "Intelligence",
    columns: ["id", "org_id", "vendor_name", "gstin", "score", "rating", "computed_at"], editable: [], searchable: "vendor_name", orderBy: "computed_at",
  },

  // ── Reconciliation ─────────────────────────────────────────────────────
  bank_txns: {
    schema: "reconciliation", table: "bank_txns", pk: "id", label: "Bank Transactions", group: "Reconciliation",
    columns: ["id", "org_id", "ext_ref", "amount", "direction", "txn_date", "matched", "created_at"], editable: [], orderBy: "txn_date",
  },
  pending_items: {
    schema: "reconciliation", table: "pending_items", pk: "id", label: "Pending Items", group: "Reconciliation",
    columns: ["id", "org_id", "vendor", "category", "amount", "invoice_no", "item_date", "matched", "created_at"], editable: ["matched"], searchable: "vendor", orderBy: "created_at",
  },
  reconciliations: {
    schema: "reconciliation", table: "reconciliations", pk: "id", label: "Reconciliations", group: "Reconciliation",
    columns: ["id", "org_id", "pending_id", "bank_txn_id", "match_confidence", "method", "status", "resolved_by", "created_at"], editable: ["status"], orderBy: "created_at",
  },

  // ── Workflow & Legal ───────────────────────────────────────────────────
  exceptions: {
    schema: "exception", table: "exceptions", pk: "id", label: "Exceptions", group: "Workflow & Legal",
    columns: ["id", "org_id", "type", "severity", "raised_by", "assigned_to", "sla_due_at", "status", "created_at"],
    editable: ["severity", "status", "assigned_to"], orderBy: "created_at",
  },
  lifeguard_cases: {
    schema: "lifeguard", table: "lifeguard_cases", pk: "id", label: "Lifeguard Cases", group: "Workflow & Legal",
    columns: ["id", "org_id", "category", "severity", "source", "status", "assigned_to", "raised_by", "created_at"],
    editable: ["severity", "status", "assigned_to"], orderBy: "created_at",
  },
  legal_cases: {
    schema: "legal", table: "legal_cases", pk: "id", label: "Legal Cases", group: "Workflow & Legal",
    columns: ["id", "org_id", "lawyer_id", "type", "title", "status", "created_at"],
    editable: ["lawyer_id", "status"], searchable: "title", orderBy: "created_at",
  },
  legal_documents: {
    schema: "legal", table: "legal_documents", pk: "id", label: "Legal Documents (T&C/Privacy)", group: "Workflow & Legal",
    columns: ["id", "doc_type", "version", "title", "url", "content_hash", "effective_at", "published", "created_at"],
    editable: ["title", "url", "published"], searchable: "title", orderBy: "effective_at",
  },
  warranty_claims: {
    schema: "warranty", table: "warranty_claims", pk: "id", label: "Warranty Claims", group: "Workflow & Legal",
    columns: ["id", "org_id", "type", "penalty_amount", "description", "evidence_doc_id", "status", "verdict", "submitted_by", "created_at"],
    editable: ["status", "verdict"], orderBy: "created_at",
  },

  // ── Onboarding & CRM ───────────────────────────────────────────────────
  onboarding_profiles: {
    schema: "onboarding", table: "onboarding_profiles", pk: "id", label: "Onboarding Profiles", group: "Onboarding & CRM",
    columns: ["id", "org_id", "stage", "completeness", "financial_maturity", "compliance_risk", "cashflow_risk", "confidence_score", "selected_professional_id", "created_at"],
    editable: ["stage"], orderBy: "created_at",
  },
  landing_contacts: {
    schema: "onboarding", table: "landing_contacts", pk: "id", label: "Leads (Contacts)", group: "Onboarding & CRM",
    columns: ["id", "first_name", "last_name", "email", "company", "message", "created_at"], editable: [], searchable: "email", orderBy: "created_at",
  },

  // ── Engagement ─────────────────────────────────────────────────────────
  notifications: {
    schema: "notification", table: "notifications", pk: "id", label: "Notifications", group: "Engagement",
    columns: ["id", "org_id", "user_id", "channel", "template", "title", "severity", "status", "read_at", "sent_at", "created_at"],
    editable: ["status"], searchable: "title", orderBy: "created_at",
  },

  // ── Audit & Security (immutable / read-only) ───────────────────────────
  audit_log: {
    schema: "audit", table: "audit_log", pk: "id", label: "Audit Log", group: "Audit & Security",
    columns: ["id", "seq", "org_id", "actor_id", "event", "correlation_id", "occurred_at", "recorded_at"],
    editable: [], orderBy: "recorded_at",
  },
  admin_access_log: {
    schema: "adminconsole", table: "admin_access_log", pk: "id", label: "Admin Access Log", group: "Audit & Security",
    columns: ["id", "admin_id", "action", "target", "target_id", "created_at"], editable: [], orderBy: "created_at",
  },
  login_attempts: {
    schema: "auth", table: "login_attempts", pk: "id", label: "Login Attempts", group: "Audit & Security",
    columns: ["id", "identifier", "ip", "success", "created_at"], editable: [], searchable: "identifier", orderBy: "created_at",
  },
  document_acceptances: {
    schema: "legal", table: "document_acceptances", pk: "id", label: "T&C / Privacy Acceptances", group: "Audit & Security",
    // Append-only legal proof — never editable.
    columns: ["id", "user_id", "org_id", "document_id", "doc_type", "version", "accepted_at", "ip", "user_agent", "method"],
    editable: [], orderBy: "accepted_at",
  },
};

export function tableKeys(): string[] {
  return Object.keys(TABLES);
}

/** Entities grouped by domain — drives the admin sidebar. */
export function tableGroups(): { group: string; entities: { key: string; label: string }[] }[] {
  const byGroup = new Map<string, { key: string; label: string }[]>();
  for (const [key, t] of Object.entries(TABLES)) {
    if (!byGroup.has(t.group)) byGroup.set(t.group, []);
    byGroup.get(t.group)!.push({ key, label: t.label });
  }
  return [...byGroup.entries()].map(([group, entities]) => ({ group, entities }));
}
