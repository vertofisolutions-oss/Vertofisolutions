"use client";
export const dynamic = "force-dynamic";
import { Suspense, useCallback, useEffect, useRef, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid, Receipt, ShoppingCart, Users, Package, Boxes, Plus, Sparkles, ArrowRight,
  FileText, FileStack, Truck, Loader2, Download, PieChart, BookOpen, Wallet, Landmark,
} from "lucide-react";
import { InventoryView } from "../../components/InventoryView";
import { SalesView } from "../../components/SalesView";
import { CreateProformaInvoice } from "../../components/CreateProformaInvoice";
import { CreateDeliveryChallan } from "../../components/CreateDeliveryChallan";
import { ProformaInvoicesView } from "../../components/ProformaInvoicesView";
import { CreditNotesView } from "../../components/CreditNotesView";
import { CreateCreditNoteView } from "../../components/CreateCreditNoteView";
import { AdvanceAmountView } from "../../components/AdvanceAmountView";
import { CreateAdvanceAmountView } from "../../components/CreateAdvanceAmountView";
import { PurchasesView } from "../../components/PurchasesView";
import { CreatePurchaseView } from "../../components/CreatePurchaseView";
import { CreatePurchaseOrderView } from "../../components/CreatePurchaseOrderView";
import { ManagePurchaseOrdersView } from "../../components/ManagePurchaseOrdersView";
import { DebitNotesView } from "../../components/DebitNotesView";
import { CreateDebitNoteView } from "../../components/CreateDebitNoteView";
import { CustomersView } from "../../components/CustomersView";
import { AddCustomerView } from "../../components/AddCustomerView";
import { SuppliersView } from "../../components/SuppliersView";
import { AddSupplierView } from "../../components/AddSupplierView";
import { ProductsView } from "../../components/ProductsView";
import { AddProductView } from "../../components/AddProductView";
import { ManageCategoriesView } from "../../components/ManageCategoriesView";
import { AddCategoryView } from "../../components/AddCategoryView";
import { StockLogView } from "../../components/StockLogView";
import { EInvoicingView } from "../../components/EInvoicingView";
import { EWayBillsView } from "../../components/EWayBillsView";
import { CreateEWayBillView } from "../../components/CreateEWayBillView";
import { CancelledEWayBillsView } from "../../components/CancelledEWayBillsView";
import { CancelEWayBillView } from "../../components/CancelEWayBillView";
import { TransportersView } from "../../components/TransportersView";
import { DeliveryChallansView } from "../../components/DeliveryChallansView";
import { ExpensesView } from "../../components/ExpensesView";
import { ReconciliationView } from "../../components/ReconciliationView";
import { DocumentCenter } from "../../components/DocumentCenter";
import { ReportsCenter } from "../../components/ReportsCenter";
import { IntelligenceHub } from "../../components/IntelligenceHub";
import { GstDashboardView } from "../../components/GstDashboardView";
import { Badge, Button, Card, EmptyState } from "@/ui";
import { SidebarShell } from "../../components/SidebarShell";
import { CreateInvoice } from "../../components/CreateInvoice";
import { CreateDocument } from "../../components/CreateDocument";
import { DocumentUpload } from "../../components/DocumentUpload";
import { api, getAccess, getOrgId, ApiError } from "@/lib/api";
import { MODULES } from "../../components/module/registry";
import { LockedFeatureGate } from "../../components/LockedFeatureGate";
import { AuthGuard } from "../../components/AuthGuard";

const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "sales", label: "Sales", icon: Receipt },
  
  { key: "purchases", label: "Purchases", icon: ShoppingCart },
  { key: "customers", label: "Customers", icon: Users },
  { key: "suppliers", label: "Suppliers", icon: Users },
  { key: "products", label: "Products", icon: Package },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "expenses", label: "Expenses", icon: Wallet },
  { key: "reconciliation", label: "Bank Reconciliation", icon: Landmark },
  { key: "reports", label: "Reports", icon: PieChart },
  { key: "intelligence", label: "AI Intelligence", icon: Sparkles },
  { key: "gst", label: "GST Dashboard", icon: FileText },
  { key: "ewaybill", label: "E-Way Bills", icon: Truck },
] as const;

function dedupeWorkspaceRows(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const item of items) {
    const docType = String(item.doc_type || item.docType || "").toUpperCase();
    const invNoRaw = String(item.invoice_no ?? item.invoiceNo ?? "").trim();
    if (docType === "PURCHASE_BILL" || docType === "PURCHASE" || invNoRaw.startsWith("PUR-")) {
      continue;
    }

    const custName = String(item.customer_name || item.customerName || item.name || item.vendor_name || "").toLowerCase().trim();
    const invNo = invNoRaw.toUpperCase();
    const idStr = String(item.id || Math.random());
    const key = invNo ? `inv:${invNo}` : `id:${idStr}`;

    if (!seen.has(key)) {
      seen.add(key);
      out.push({
        ...item,
        customer_name: item.customer_name || item.customerName || "—",
        customerName: item.customer_name || item.customerName || "—",
        invoice_no: item.invoice_no || item.invoiceNo || "INV-001",
        invoiceNo: item.invoice_no || item.invoiceNo || "INV-001",
        doc_type: item.doc_type || item.docType || "Tax Invoice",
      });
    }
  }
  return out;
}

function parseLocation() {
  if (typeof window === "undefined") return { section: "sales", action: null };
  const url = new URL(window.location.href);
  let sec = url.searchParams.get("section");
  if (sec === "documents" || sec === "overview") {
    sec = "sales";
  }
  const act = url.searchParams.get("action");
  if (!sec && act) {
    if (
      act === "create-invoice" ||
      act === "create-quotation" ||
      act === "create-credit-note" ||
      act === "proforma-invoice" ||
      act === "create-proforma-invoice" ||
      act === "delivery-challan" ||
      act === "create-delivery-challan" ||
      act === "advance-amount" ||
      act === "create-advance-amount" ||
      act === "manage-advance-amount" ||
      act === "manage-credit-notes"
    ) {
      sec = "sales";
    } else if (
      act === "record-purchase" ||
      act === "purchase-order" ||
      act === "debit-note" ||
      act === "create-purchase" ||
      act === "create-purchase-order" ||
      act === "manage-purchase-order" ||
      act === "create-debit-note" ||
      act === "manage-debit-note"
    ) {
      sec = "purchases";
    } else if (act === "add-customer") {
      sec = "customers";
    } else if (act === "add-supplier") {
      sec = "suppliers";
    } else if (act === "add-product" || act === "add-category" || act === "manage-category") {
      sec = "products";
    } else if (act === "stock-log") {
      sec = "inventory";
    } else if (act === "create-ewaybill" || act === "cancel-ewaybill" || act === "manage-cancelled" || act === "manage-transporter") {
      sec = "ewaybill";
    }
  }
  return {
    section: sec && SECTIONS.some((x) => x.key === sec && x.key !== "overview") ? sec : "sales",
    action: act,
  };
}

export default function Workspace() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <WorkspaceInner />
      </Suspense>
    </AuthGuard>
  );
}

function WorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgId, setOrgId] = useState<string>("demo-business-org");
  const [section, setSection] = useState<string>("sales");
  const [action, setAction] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [creating, setCreating] = useState<{ initial?: string } | null>(null);
  const [docModal, setDocModal] = useState<{ type?: string } | null>(null);
  // Track whether a custom event already handled the last navigation
  const customNavRef = useRef<{ section: string; action: string | null } | null>(null);

  // Start with empty state (matches SSR) — hydrate from localStorage after mount
  const [rowsCache, setRowsCache] = useState<Record<string, Record<string, unknown>[]>>({
    sales: [], purchases: [], customers: [], products: [], inventory: [],
  });
  const [loading, setLoading] = useState(false);

  // After hydration, load only user-created data (no seed/demo data)
  useEffect(() => {
    // One-time migration: clear old demo/generated invoice data
    const migrated = localStorage.getItem("vertofi_demo_cleared_v1");
    if (!migrated) {
      localStorage.removeItem("vertofi_generated_invoices");
      // Remove seed rows from vertofi_local_sales
      try {
        const raw = localStorage.getItem("vertofi_local_sales");
        if (raw) {
          const parsed: Record<string, unknown>[] = JSON.parse(raw);
          const cleaned = parsed.filter(
            (r) => r.id !== "seed-1" && r.id !== "seed-2"
          );
          localStorage.setItem("vertofi_local_sales", JSON.stringify(cleaned));
        }
      } catch { /* ignore */ }
      localStorage.setItem("vertofi_demo_cleared_v1", "1");
    }

    const renumbered = localStorage.getItem("vertofi_renumbered_v1");
    if (!renumbered) {
      try {
        const raw = localStorage.getItem("vertofi_local_sales");
        if (raw) {
          const parsed: Record<string, unknown>[] = JSON.parse(raw);
          // Reverse so oldest is first
          parsed.reverse();
          parsed.forEach((r, idx) => {
            r.invoice_no = `INV/${String(idx + 1).padStart(4, "0")}`;
            if (r.invoiceNo) r.invoiceNo = r.invoice_no;
          });
          // Reverse back so newest is first
          parsed.reverse();
          localStorage.setItem("vertofi_local_sales", JSON.stringify(parsed));
          window.dispatchEvent(new Event("storage"));
        }
      } catch { /* ignore */ }
      localStorage.setItem("vertofi_renumbered_v1", "1");
    }

    try {
      const salesRaw = localStorage.getItem("vertofi_local_sales");
      if (salesRaw) {
        const sales: Record<string, unknown>[] = JSON.parse(salesRaw);
        const purchases = sales.filter((s) => String(s.doc_type || s.docType).toUpperCase() === "PURCHASE_BILL" || String(s.invoice_no || s.invoiceNo || "").startsWith("PUR-"));
        const pureSales = sales.filter((s) => String(s.doc_type || s.docType).toUpperCase() !== "PURCHASE_BILL" && !String(s.invoice_no || s.invoiceNo || "").startsWith("PUR-"));

        if (purchases.length > 0) {
          const existingPurchRaw = localStorage.getItem("vertofi_local_purchases");
          const existingPurch = existingPurchRaw ? JSON.parse(existingPurchRaw) : [];
          localStorage.setItem("vertofi_local_purchases", JSON.stringify([...purchases, ...existingPurch]));
          window.dispatchEvent(new Event("vertofi-purchases-changed"));
        }

        const dedupedSales = dedupeWorkspaceRows(pureSales);
        localStorage.setItem("vertofi_local_sales", JSON.stringify(dedupedSales));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("vertofi-sales-changed"));
      }
    } catch { /* ignore */ }

    try {
      // Only load what the user actually created — no fallback seed rows
      const salesData: Record<string, unknown>[] = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
      setRowsCache({
        sales: dedupeWorkspaceRows(salesData),
        purchases: JSON.parse(localStorage.getItem("vertofi_local_purchases") || "[]"),
        customers: JSON.parse(localStorage.getItem("vertofi_local_customers") || "[]"),
        products: JSON.parse(localStorage.getItem("vertofi_local_products") || "[]"),
        inventory: JSON.parse(localStorage.getItem("vertofi_local_inventory") || "[]"),
      });
    } catch {
      // localStorage unavailable — leave cache empty, API load will populate it
    }
  }, []);

  // Sync client-side state after hydration
  useEffect(() => {
    if (!getAccess()) {
      router.replace("/login");
      return;
    }

    const oid = getOrgId() || "demo-business-org";
    setOrgId(oid);

    const parsed = parseLocation();
    setSection(parsed.section);
    setAction(parsed.action);
  }, [router]);

  const rows = rowsCache[section] || [];

  // Handle instant custom navigation & popstate
  useEffect(() => {
    const handleWorkspaceNav = (e: Event) => {
      const custom = e as CustomEvent<{ section?: string; action?: string | null; href?: string }>;
      if (custom.detail) {
        const newSection = custom.detail.section || parseLocation().section;
        const newAction = custom.detail.action ?? null;
        // Apply immediately
        customNavRef.current = { section: newSection, action: newAction };
        setSection(newSection);
        setAction(newAction);
      }
    };
    const handlePopState = () => {
      const parsed = parseLocation();
      customNavRef.current = null;
      setSection(parsed.section);
      setAction(parsed.action);
    };
    const handleInvoiceDeleted = (e: Event) => {
      const custom = e as CustomEvent<{ id?: string; invoice_no?: string }>;
      if (custom.detail) {
        const targetId = custom.detail.id;
        const targetNo = custom.detail.invoice_no;
        setRowsCache((prev) => ({
          ...prev,
          sales: (prev.sales || []).filter((item) => {
            const itemId = String(item.id ?? "");
            const itemNo = String(item.invoice_no ?? item.invoiceNo ?? "");
            if (targetId && itemId === targetId) return false;
            if (targetNo && itemNo === targetNo) return false;
            return true;
          }),
        }));
      }
    };
    const handleStorageChange = () => {
      try {
        const salesData: Record<string, unknown>[] = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        setRowsCache((prev) => ({
          ...prev,
          sales: dedupeWorkspaceRows(salesData),
          purchases: JSON.parse(localStorage.getItem("vertofi_local_purchases") || "[]"),
          customers: JSON.parse(localStorage.getItem("vertofi_local_customers") || "[]"),
          products: JSON.parse(localStorage.getItem("vertofi_local_products") || "[]"),
          inventory: JSON.parse(localStorage.getItem("vertofi_local_inventory") || "[]"),
        }));
      } catch {}
    };
    window.addEventListener("vertofi:workspace-nav", handleWorkspaceNav);
    window.addEventListener("vertofi:invoice-deleted", handleInvoiceDeleted);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("vertofi:workspace-nav", handleWorkspaceNav);
      window.removeEventListener("vertofi:invoice-deleted", handleInvoiceDeleted);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Sync when searchParams change via Next.js routing (skip if custom event already handled it)
  useEffect(() => {
    const parsed = parseLocation();
    // If our custom nav ref matches what's in the URL, it's already applied — just clear the ref
    if (
      customNavRef.current &&
      customNavRef.current.section === parsed.section &&
      customNavRef.current.action === parsed.action
    ) {
      customNavRef.current = null;
      return;
    }
    // Otherwise apply URL-driven navigation (e.g. direct URL load, back/forward)
    customNavRef.current = null;
    setSection(parsed.section);
    setAction(parsed.action);
  }, [searchParams]);

  // Instant action switcher helper for inside views (0ms UI latency)
  const handleActionChange = useCallback((sec: string, act: string | null) => {
    setSection(sec);
    setAction(act);
    const query = new URLSearchParams();
    if (sec !== "overview") query.set("section", sec);
    if (act) query.set("action", act);
    const queryString = query.toString();
    const newUrl = queryString ? `/workspace?${queryString}` : "/workspace";
    
    window.history.pushState(null, "", newUrl);
    window.dispatchEvent(new CustomEvent("vertofi:workspace-nav", { detail: { section: sec, action: act, href: newUrl } }));
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [router]);

  const handleTabClick = (key: string) => {
    handleActionChange(key, null);
  };

  // Background SWR loader that updates cache without blanking the screen
  const load = useCallback(async (sec: string, oid: string) => {
    try {
      const map: Record<string, () => Promise<Record<string, unknown>[]>> = {
        sales: () => api.acc.sales(oid),
        overview: () => api.acc.documents(oid),
        purchases: () => api.acc.purchases(oid),
        customers: () => api.acc.customers(oid),
        products: () => api.acc.products(oid),
        inventory: () => api.acc.inventory(oid),
      };
      const rawData = map[sec] ? await map[sec]!() : [];
      let data = Array.isArray(rawData) ? rawData : [];

      if (sec === "sales" && typeof window !== "undefined") {
        try {
          // Only merge user-created local sales (no generated demo invoices)
          const storedStr = localStorage.getItem("vertofi_local_sales");
          const stored: Record<string, unknown>[] = storedStr ? JSON.parse(storedStr) : [];
          const existingIds = new Set(data.map((x) => String(x.invoice_no ?? x.invoiceNo ?? x.id)));
          const extraLocal = stored.filter(
            (x) => x.id !== "seed-1" && x.id !== "seed-2" &&
            !existingIds.has(String(x.invoice_no ?? x.invoiceNo ?? x.id))
          );
          data = dedupeWorkspaceRows([...extraLocal, ...data]);
        } catch (_e) {
          /* ignore */
        }
      }

      setRowsCache((prev) => ({ ...prev, [sec]: dedupeWorkspaceRows(data) }));
    } catch {
      let fallbackData: Record<string, unknown>[] = [];
      if (sec === "sales" && typeof window !== "undefined") {
        try {
          fallbackData = dedupeWorkspaceRows(JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]"));
        } catch (_e) {}
      }
      setRowsCache((prev) => ({ ...prev, [sec]: fallbackData }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orgId && section !== "overview") void load(section, orgId);
  }, [orgId, section, load]);

  return (
    <SidebarShell>
      <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-8">

        {/* Content (full width) */}
        <div className="space-y-6">
          {/* Command Center bar (only on overview) */}
          {section === "overview" && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (command.trim()) setCreating({ initial: command.trim() }); }}
              className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 shadow-card focus-within:border-brand"
            >
              <Sparkles className="h-4 w-4 text-brand" />
              <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Command Center —  Create Tax Invoice · New Quotation · Show overdue customers · Generate P&L" value={command} onChange={(e) => setCommand(e.target.value)} />
              <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Run</button>
            </form>
          )}

          {section === "overview" && orgId && (
            <DocumentCenter orgId={orgId} rows={rows} loading={loading} onPick={(type) => setDocModal({ type })} reload={() => load(section, orgId)} />
          )}

          {section === "sales" && orgId && (
            <LockedFeatureGate feature="sales_invoicing">
              {action === "create-invoice" ? (
                <CreateInvoice
                  orgId={orgId}
                  inline={true}
                  onClose={() => handleActionChange("sales", null)}
                  onCreated={() => { handleActionChange("sales", null); void load("sales", orgId); }}
                />
              ) : action === "create-credit-note" ? (
                <CreateCreditNoteView
                  orgId={orgId}
                  onClose={() => handleActionChange("sales", "manage-credit-notes")}
                  onCreated={() => handleActionChange("sales", "manage-credit-notes")}
                />
              ) : action === "manage-credit-notes" ? (
                <CreditNotesView
                  orgId={orgId}
                  onNewCreditNote={() => handleActionChange("sales", "create-credit-note")}
                />
              ) : action === "create-advance-amount" ? (
                <CreateAdvanceAmountView
                  orgId={orgId}
                  onClose={() => handleActionChange("sales", "advance-amount")}
                  onCreated={() => { handleActionChange("sales", "advance-amount"); void load("sales", orgId); }}
                />
              ) : action === "advance-amount" || action === "manage-advance-amount" ? (
                <AdvanceAmountView
                  orgId={orgId}
                  onNewAdvance={() => handleActionChange("sales", "create-advance-amount")}
                />
              ) : action === "delivery-challan" ? (
                <DeliveryChallansView
                  orgId={orgId}
                  onNewChallan={() => handleActionChange("sales", "create-delivery-challan")}
                />
              ) : action === "create-delivery-challan" ? (
                <CreateDeliveryChallan
                  orgId={orgId}
                  inline={true}
                  onClose={() => handleActionChange("sales", "delivery-challan")}
                  onCreated={() => { handleActionChange("sales", "delivery-challan"); void load("sales", orgId); }}
                />
              ) : action === "proforma-invoice" ? (
                <ProformaInvoicesView
                  orgId={orgId}
                  rows={rows}
                  loading={loading}
                  onNewInvoice={() => handleActionChange("sales", "create-proforma-invoice")}
                />
              ) : action === "create-proforma-invoice" ? (
                <CreateProformaInvoice
                  orgId={orgId}
                  inline={true}
                  onClose={() => handleActionChange("sales", "proforma-invoice")}
                  onCreated={() => { handleActionChange("sales", "proforma-invoice"); void load("sales", orgId); }}
                />
              ) : (
                <SalesView
                  orgId={orgId}
                  rows={rows}
                  loading={loading}
                  onNewInvoice={() => handleActionChange("sales", "create-invoice")}
                  onNewDoc={() => handleActionChange("sales", "create-invoice")}
                />
              )}
            </LockedFeatureGate>
          )}
          {section === "purchases" && orgId && (
            <LockedFeatureGate feature="purchases">
              {action === "create-purchase" ? (
                <CreatePurchaseView
                  orgId={orgId}
                  onClose={() => handleActionChange("purchases", null)}
                  onCreated={() => handleActionChange("purchases", null)}
                />
              ) : action === "create-purchase-order" ? (
                <CreatePurchaseOrderView
                  orgId={orgId}
                  onClose={() => handleActionChange("purchases", "manage-purchase-order")}
                  onCreated={() => handleActionChange("purchases", "manage-purchase-order")}
                />
              ) : action === "manage-purchase-order" ? (
                <ManagePurchaseOrdersView
                  orgId={orgId}
                  onNewPO={() => handleActionChange("purchases", "create-purchase-order")}
                />
              ) : action === "create-debit-note" ? (
                <CreateDebitNoteView
                  orgId={orgId}
                  onClose={() => handleActionChange("purchases", "manage-debit-note")}
                  onCreated={() => handleActionChange("purchases", "manage-debit-note")}
                />
              ) : action === "manage-debit-note" ? (
                <DebitNotesView
                  orgId={orgId}
                  onNewDebitNote={() => handleActionChange("purchases", "create-debit-note")}
                />
              ) : (
                <PurchasesView
                  orgId={orgId}
                  onNewPurchase={() => handleActionChange("purchases", "create-purchase")}
                />
              )}
            </LockedFeatureGate>
          )}
          {section === "customers" && orgId && (
            <LockedFeatureGate feature="customers">
              {action === "add-customer" ? (
                <AddCustomerView
                  orgId={orgId}
                  onClose={() => handleActionChange("customers", null)}
                  onCreated={() => handleActionChange("customers", null)}
                />
              ) : (
                <CustomersView
                  orgId={orgId}
                  rows={rows}
                  loading={loading}
                  reload={() => load("customers", orgId)}
                  onNewCustomer={() => handleActionChange("customers", "add-customer")}
                />
              )}
            </LockedFeatureGate>
          )}
          {section === "suppliers" && orgId && (
            <LockedFeatureGate feature="purchases">
              {action === "add-supplier" ? (
                <AddSupplierView
                  orgId={orgId}
                  onClose={() => handleActionChange("suppliers", null)}
                  onCreated={() => handleActionChange("suppliers", null)}
                />
              ) : (
                <SuppliersView
                  orgId={orgId}
                  rows={rows}
                  loading={loading}
                  onNewSupplier={() => handleActionChange("suppliers", "add-supplier")}
                />
              )}
            </LockedFeatureGate>
          )}
          {section === "products" && orgId && (
            <LockedFeatureGate feature="products">
              {action === "add-product" ? (
                <AddProductView
                  orgId={orgId}
                  onClose={() => handleActionChange("products", null)}
                  onCreated={() => handleActionChange("products", null)}
                />
              ) : action === "add-category" ? (
                <AddCategoryView
                  orgId={orgId}
                  onClose={() => handleActionChange("products", "manage-category")}
                  onCreated={() => handleActionChange("products", "manage-category")}
                />
              ) : action === "manage-category" ? (
                <ManageCategoriesView
                  orgId={orgId}
                  onNewCategory={() => handleActionChange("products", "add-category")}
                />
              ) : (
                <ProductsView
                  orgId={orgId}
                  rows={rows}
                  loading={loading}
                  reload={() => load("products", orgId)}
                  onNewProduct={() => handleActionChange("products", "add-product")}
                />
              )}
            </LockedFeatureGate>
          )}
          {section === "inventory" && orgId && (
            <LockedFeatureGate feature="inventory">
              {action === "stock-log" ? (
                <StockLogView orgId={orgId} />
              ) : (
                <InventoryView orgId={orgId} />
              )}
            </LockedFeatureGate>
          )}
          {section === "einvoicing" && orgId && (
            <LockedFeatureGate feature="einvoicing">
              <EInvoicingView orgId={orgId} />
            </LockedFeatureGate>
          )}
          {section === "ewaybill" && orgId && (
            <LockedFeatureGate feature="ewaybill">
              {action === "create-ewaybill" ? (
                <CreateEWayBillView
                  orgId={orgId}
                  onClose={() => handleActionChange("ewaybill", null)}
                  onCreated={() => handleActionChange("ewaybill", null)}
                />
              ) : action === "cancel-ewaybill" ? (
                <CancelEWayBillView
                  orgId={orgId}
                  onClose={() => handleActionChange("ewaybill", null)}
                  onCancelled={() => handleActionChange("ewaybill", null)}
                />
              ) : action === "manage-cancelled" ? (
                <CancelledEWayBillsView
                  orgId={orgId}
                  onCancelEWayBill={() => handleActionChange("ewaybill", "cancel-ewaybill")}
                />
              ) : action === "manage-transporter" ? (
                <TransportersView orgId={orgId} />
              ) : (
                <EWayBillsView
                  orgId={orgId}
                  onNewEWayBill={() => handleActionChange("ewaybill", "create-ewaybill")}
                />
              )}
            </LockedFeatureGate>
          )}
          {section === "expenses" && orgId && (
            <ExpensesView orgId={orgId} />
          )}
          {section === "reconciliation" && orgId && (
            <LockedFeatureGate feature="bank_reconciliation">
              <ReconciliationView orgId={orgId} />
            </LockedFeatureGate>
          )}
          {section === "reports" && orgId && (
            <LockedFeatureGate feature="pnl_reports">
              <ReportsCenter orgId={orgId} />
            </LockedFeatureGate>
          )}
          {section === "gst" && orgId && (
            <LockedFeatureGate feature="gst_monitoring">
              <GstDashboardView orgId={orgId} />
            </LockedFeatureGate>
          )}
          {section === "intelligence" && orgId && (
            <LockedFeatureGate feature="ai_advisor">
              <IntelligenceHub orgId={orgId} />
            </LockedFeatureGate>
          )}
        </div>
      </main>
    </SidebarShell>
  );
}

function QuickAction({ label, icon: Icon, onClick }: { label: string; icon: typeof Receipt; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-3 rounded-2xl border border-borderCard bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand"><Icon className="h-4 w-4" /></span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </button>
  );
}

function ListView({ title, rows, cols, loading, action, rowAction, empty }: { title: string; rows: Record<string, unknown>[]; cols: [string, string][]; loading: boolean; action?: React.ReactNode; rowAction?: (row: Record<string, unknown>) => React.ReactNode; empty: string }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {loading ? <p className="py-8 text-center text-sm text-muted">Loading…</p> : rows.length === 0 ? <EmptyState title={empty} description="Create your first record or use the command bar above." /> : (
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg2 text-xs uppercase tracking-wide text-muted"><tr>{cols.map(([, l]) => <th key={l} className="px-3 py-2 font-semibold">{l}</th>)}{rowAction && <th className="px-3 py-2 font-semibold text-right">GST</th>}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-borderCard">
                  {cols.map(([k]) => <td key={k} className="px-3 py-2 text-ink">{k === "total" || k === "rate" ? `₹${String(r[k] ?? 0)}` : String(r[k] ?? "—")}</td>)}
                  {rowAction && <td className="px-3 py-2 text-right">{rowAction(r)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/**
 * e-Invoice (IRN) / e-Way bill actions on a sales invoice. Calls the GSP
 * connector via the gateway. The connector returns an honest status —
 * NEEDS_CREDENTIALS until the GSP credentials are configured — and we surface
 * that plainly rather than faking an IRN.
 */
function GstActions({ invoice }: { invoice: Record<string, unknown> }) {
  const [busy, setBusy] = useState<"pdf" | "einvoice" | "ewaybill" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function downloadPdf() {
    setBusy("pdf");
    setResult(null);
    try {
      const no = String(invoice.invoice_no ?? "invoice");
      await api.mod.downloadSalesPdf(getOrgId()!, String(invoice.id), `${no.replace(/[^\w.-]/g, "_")}.pdf`);
      setResult({ ok: true, text: "PDF downloaded" });
    } catch (err) {
      setResult({ ok: false, text: err instanceof ApiError ? err.code.replaceAll("_", " ") : "download failed" });
    } finally {
      setBusy(null);
    }
  }

  async function run(kind: "einvoice" | "ewaybill") {
    setBusy(kind);
    setResult(null);
    try {
      if (kind === "einvoice") {
        const r = await api.gst.einvoice(invoice);
        setResult(
          r.connector === "ACTIVE" && r.irn
            ? { ok: true, text: `IRN ${String(r.irn).slice(0, 12)}…` }
            : { ok: false, text: "Connect GST credentials to generate IRN" },
        );
      } else {
        const r = await api.gst.ewaybill(invoice);
        setResult(
          r.connector === "ACTIVE" && r.ewbNo
            ? { ok: true, text: `EWB ${r.ewbNo}` }
            : { ok: false, text: "Connect GST credentials to generate e-Way bill" },
        );
      }
    } catch (err) {
      setResult({ ok: false, text: err instanceof ApiError ? err.code.replaceAll("_", " ") : "request failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {result && (
        <span className={`mr-1 text-xs ${result.ok ? "text-emerald-600" : "text-muted"}`}>{result.text}</span>
      )}
      <button type="button" disabled={busy !== null} onClick={downloadPdf} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50" title="Download invoice PDF">
        {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
      </button>
      <button type="button" disabled={busy !== null} onClick={() => run("einvoice")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-ink transition hover:bg-bg2 disabled:opacity-50" title="Generate e-Invoice (IRN)">
        {busy === "einvoice" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} e-Invoice
      </button>
      <button type="button" disabled={busy !== null} onClick={() => run("ewaybill")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-ink transition hover:bg-bg2 disabled:opacity-50" title="Generate e-Way bill">
        {busy === "ewaybill" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />} e-Way
      </button>
    </div>
  );
}

/** Downscale an image to <=maxPx and return base64 (no prefix) + mime — keeps
 *  the vision call cheap and the upload small. */
/**
 * Resize + compress any uploaded image entirely in the browser before it's sent.
 * Caps the longest edge at `maxPx` and steps JPEG quality down until the encoded
 * image is under `targetBytes` (~1.4 MB) — so a 10 MB phone photo becomes a small
 * payload that never trips the API body limit, and the AI reads it faster.
 */
function downscaleImage(file: File, maxPx = 1280, targetBytes = 1_400_000): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no_canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      // Approx encoded byte size from a base64 string length.
      const bytesOf = (b64: string) => Math.floor((b64.length * 3) / 4);
      let quality = 0.82;
      let b64 = (canvas.toDataURL("image/jpeg", quality).split(",")[1]) ?? "";
      while (bytesOf(b64) > targetBytes && quality > 0.4) {
        quality -= 0.12;
        b64 = (canvas.toDataURL("image/jpeg", quality).split(",")[1]) ?? "";
      }
      resolve({ b64, mime: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad_image")); };
    img.src = url;
  });
}



function getSampleWorkspaceRows(sec: string): Record<string, unknown>[] {
  if (sec === "sales") {
    return [
      { id: "inv-1", invoice_no: "INV-2026-001", customer_name: "Reliance Digital Ltd", total: 145000, status: "PAID", issue_date: "2026-08-20" },
      { id: "inv-2", invoice_no: "INV-2026-002", customer_name: "Infosys BPM", total: 82500, status: "ISSUED", issue_date: "2026-08-21" },
      { id: "inv-3", invoice_no: "INV-2026-003", customer_name: "Tata Consultancy Services", total: 230000, status: "PENDING", issue_date: "2026-08-22" },
    ];
  }
  if (sec === "purchases") {
    return [
      { id: "bill-1", bill_no: "BILL-8891", vendor_name: "Dell India Tech", total: 112000, status: "VERIFIED", source: "OCR_SCAN" },
      { id: "bill-2", bill_no: "BILL-8892", vendor_name: "Amazon Cloud Services", total: 45600, status: "PROCESSED", source: "EMAIL_IMPORT" },
      { id: "bill-3", bill_no: "BILL-8893", vendor_name: "Airtel Business Enterprise", total: 18400, status: "VERIFIED", source: "GST_AUTO" },
    ];
  }
  if (sec === "customers") {
    return [
      { id: "cust-1", name: "Reliance Digital Ltd", gstin: "27AAACR5055K1Z8", email: "billing@reliancedigital.com", total: "145000" },
      { id: "cust-2", name: "Infosys BPM", gstin: "29AABCI1234F1Z5", email: "finance@infosys.com", total: "82500" },
      { id: "cust-3", name: "Tata Consultancy Services", gstin: "27AAACT2727Q1ZW", email: "accounts@tcs.com", total: "230000" },
    ];
  }
  if (sec === "products") {
    return [
      { id: "prod-1", name: "Cloud Accounting Subscription", hsn: "998313", rate: 4999, stock: 100 },
      { id: "prod-2", name: "GST Compliance & Filing Package", hsn: "998222", rate: 2999, stock: 250 },
      { id: "prod-3", name: "Financial Audit Support", hsn: "998231", rate: 12000, stock: 50 },
    ];
  }
  if (sec === "overview" || sec === "bookkeeping") {
    return [
      { id: "doc-1", invoice_no: "INV-2026-001", customer_name: "Reliance Digital Ltd", total: 145000, status: "PAID" },
      { id: "doc-2", invoice_no: "INV-2026-002", customer_name: "Infosys BPM", total: 82500, status: "ISSUED" },
    ];
  }
  return [];
}
