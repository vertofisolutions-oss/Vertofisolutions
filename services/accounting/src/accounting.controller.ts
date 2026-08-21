import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentPrincipal, Roles } from "@vertofi/auth-guards";
import type { Principal } from "@vertofi/tenancy";
import { AccountingService } from "./accounting.service.js";
import type { InvoiceItem } from "./tax.js";
import { DOC_TYPES, docCatalog, type DocType } from "./docgen/templates.js";
import { REPORT_CATALOG, type ReportSection } from "./docgen/report.js";

class CreateDocDto {
  @IsIn(DOC_TYPES) type!: DocType;
  @IsOptional() @IsString() partyId?: string;
  /** Free-form party (name/gstin/state/address/phone/email) when no partyId. */
  @IsOptional() @IsObject() party?: Record<string, unknown>;
  @IsOptional() @IsObject() shipTo?: Record<string, unknown>;
  @IsArray() items!: InvoiceItem[];
  @IsOptional() @IsBoolean() interState?: boolean;
  @IsOptional() @IsString() @MaxLength(64) reference?: string;
  @IsOptional() @IsString() @MaxLength(280) notes?: string;
}

class CustomerDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}
class ProductDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() hsn?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() rate?: number;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsNumber() stock?: number;
}
class SalesInvoiceDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsArray() items!: InvoiceItem[];
  @IsOptional() @IsBoolean() interState?: boolean;
  @IsOptional() @IsString() source?: string;
}
class PurchaseInvoiceDto {
  @IsOptional() @IsString() vendorName?: string;
  @IsOptional() @IsString() vendorGstin?: string;
  @IsOptional() @IsString() billNo?: string;
  @IsArray() items!: InvoiceItem[];
  @IsOptional() @IsBoolean() interState?: boolean;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() documentId?: string;
}
class AiDraftDto {
  @IsString() @MaxLength(2000) command!: string;
  @IsOptional() @IsString() kind?: "sales" | "purchase";
}
class InventoryDto {
  @IsString() productId!: string;
  @IsString() direction!: "IN" | "OUT";
  @IsNumber() qty!: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsNumber() rate?: number;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() batchId?: string;
}
class TransferDto {
  @IsString() productId!: string;
  @IsNumber() qty!: number;
  @IsOptional() @IsString() fromWarehouseId?: string;
  @IsOptional() @IsString() toWarehouseId?: string;
  @IsOptional() @IsString() note?: string;
}
class WarehouseDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
class CategoryDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() parent?: string;
}
class BatchDto {
  @IsString() productId!: string;
  @IsString() @MaxLength(80) batchNo!: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsNumber() qty?: number;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsString() warehouseId?: string;
}
class DocActionDto {
  @IsIn(["APPROVED", "REJECTED", "SENT", "DOWNLOADED", "VIEWED", "PRINTED", "CANCELLED"]) action!: string;
  @IsOptional() @IsObject() meta?: Record<string, unknown>;
}
class WaStatusDto {
  @IsIn(["PENDING", "SENT", "DELIVERED", "FAILED"]) status!: string;
}
class ConvertDto {
  @IsString() @MaxLength(64) toType!: string;
}
class ReportPdfDto {
  @IsString() @MaxLength(64) docType!: string;
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(240) subtitle?: string;
  @IsOptional() @IsString() @MaxLength(120) period?: string;
  @IsArray() sections!: ReportSection[];
  @IsOptional() @IsBoolean() save?: boolean;
}

class ScanDto {
  @IsString() imageB64!: string;
  @IsOptional() @IsString() mime?: string;
}
class ScanProductRow {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsNumber() rate?: number;
  @IsOptional() @IsString() hsn?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() taxRate?: number;
}
class BulkProductsDto {
  @IsArray() products!: ScanProductRow[];
}

class VendorDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() msmeNumber?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() bankAccount?: string;
  @IsOptional() @IsString() ifsc?: string;
  @IsOptional() @IsString() paymentTerms?: string;
  @IsOptional() @IsNumber() creditDays?: number;
  @IsOptional() @IsNumber() openingBalance?: number;
  @IsOptional() @IsNumber() vendorRating?: number;
  @IsOptional() @IsString() preferredPaymentMethod?: string;
  @IsOptional() @IsString() taxCategory?: string;
  @IsOptional() extra?: Record<string, unknown>;
}

class ExpenseDto {
  @IsString() @MaxLength(120) category!: string;
  @IsNumber() amount!: number;
  @IsOptional() @IsNumber() taxAmount?: number;
  @IsOptional() @IsString() expenseDate?: string;
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() vendorName?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() extra?: Record<string, unknown>;
}

const COMMENT_ENTITIES = ["SALE", "PURCHASE", "DOCUMENT"] as const;
class CommentDto {
  @IsIn(COMMENT_ENTITIES) entityType!: (typeof COMMENT_ENTITIES)[number];
  @IsString() entityId!: string;
  @IsString() @MaxLength(2000) body!: string;
}

/** Reads allowed for view roles; writes restricted to editing roles (method-level). */
@Controller("accounting")
@Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  // customers
  @Get(":orgId/customers")
  customers(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("q") q?: string) {
    return this.svc.listCustomers(p, orgId, q);
  }
  @Get(":orgId/customers/lookup")
  lookupCustomer(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("name") name: string) {
    return this.svc.lookupCustomer(p, orgId, name ?? "");
  }
  @Post(":orgId/customers")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createCustomer(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: CustomerDto) {
    return this.svc.createCustomer(p, orgId, dto as unknown as Record<string, unknown>);
  }

  // products
  @Get(":orgId/products")
  products(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("q") q?: string) {
    return this.svc.listProducts(p, orgId, q);
  }
  @Get(":orgId/products/lookup")
  lookupProduct(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("name") name: string) {
    return this.svc.lookupProduct(p, orgId, name ?? "");
  }
  /** Auto-detect HSN/SAC + GST rate for an item name (catalog → reference → AI). */
  @Get(":orgId/products/hsn")
  detectHsn(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("name") name: string) {
    return this.svc.detectHsn(p, orgId, name ?? "");
  }
  @Post(":orgId/products")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createProduct(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: ProductDto) {
    return this.svc.createProduct(p, orgId, dto as unknown as Record<string, unknown>);
  }
  /** Scan a photo of a product/price list → reviewable rows (no save yet). */
  @Post(":orgId/products/scan")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  scanProducts(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: ScanDto) {
    return this.svc.scanProductsImage(p, orgId, dto.imageB64, dto.mime ?? "image/jpeg");
  }
  /** Bulk-add reviewed products (from the scan), skipping existing names. */
  @Post(":orgId/products/bulk")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  bulkProducts(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: BulkProductsDto) {
    return this.svc.bulkCreateProducts(p, orgId, dto.products);
  }

  // sales
  @Get(":orgId/sales")
  sales(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.listSalesInvoices(p, orgId);
  }
  @Post(":orgId/sales")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createSale(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: SalesInvoiceDto) {
    return this.svc.createSalesInvoice(p, orgId, dto);
  }

  // vendor master
  @Get(":orgId/vendors")
  vendors(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("q") q?: string) {
    return this.svc.listVendors(p, orgId, q);
  }
  @Post(":orgId/vendors")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  addVendor(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: VendorDto) {
    return this.svc.addVendor(p, orgId, dto as unknown as Record<string, unknown>);
  }

  // expense management
  @Get(":orgId/expenses")
  expenses(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.listExpenses(p, orgId);
  }
  @Post(":orgId/expenses")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  addExpense(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: ExpenseDto) {
    return this.svc.addExpense(p, orgId, dto as unknown as Record<string, unknown>);
  }

  // collaboration — comment threads (owner ↔ assigned CA on the same record).
  // ACCOUNTANT may comment (it's collaboration, not a financial write).
  @Get(":orgId/comments")
  comments(
    @CurrentPrincipal() p: Principal,
    @Param("orgId") orgId: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
  ) {
    return this.svc.listComments(p, orgId, entityType, entityId);
  }
  @Post(":orgId/comments")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
  addComment(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: CommentDto) {
    return this.svc.addComment(p, orgId, dto.entityType, dto.entityId, dto.body);
  }

  // purchases
  @Get(":orgId/purchases")
  purchases(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.listPurchaseInvoices(p, orgId);
  }
  @Post(":orgId/purchases")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createPurchase(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: PurchaseInvoiceDto) {
    return this.svc.createPurchaseInvoice(p, orgId, dto);
  }

  // inventory
  @Get(":orgId/inventory")
  inventory(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.stockSummary(p, orgId);
  }
  @Post(":orgId/inventory")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  adjust(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: InventoryDto) {
    return this.svc.adjustInventory(p, orgId, dto.productId, dto.direction, dto.qty, dto.reason, { rate: dto.rate, warehouseId: dto.warehouseId, batchId: dto.batchId });
  }
  @Get(":orgId/inventory/valuation")
  valuation(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.valuationReport(p, orgId);
  }
  @Get(":orgId/inventory/low-stock")
  lowStock(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.lowStock(p, orgId);
  }
  @Get(":orgId/inventory/:productId/ledger")
  stockLedger(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("productId") productId: string) {
    return this.svc.stockLedger(p, orgId, productId);
  }
  @Post(":orgId/inventory/transfer")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  transfer(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: TransferDto) {
    return this.svc.transferStock(p, orgId, dto);
  }

  // warehouses
  @Get(":orgId/warehouses")
  warehouses(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.listWarehouses(p, orgId);
  }
  @Post(":orgId/warehouses")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createWarehouse(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: WarehouseDto) {
    return this.svc.createWarehouse(p, orgId, dto as unknown as Record<string, unknown>);
  }

  // categories
  @Get(":orgId/categories")
  categories(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.listCategories(p, orgId);
  }
  @Post(":orgId/categories")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createCategory(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: CategoryDto) {
    return this.svc.createCategory(p, orgId, dto as unknown as Record<string, unknown>);
  }

  // batches
  @Get(":orgId/batches")
  batches(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Query("productId") productId?: string) {
    return this.svc.listBatches(p, orgId, productId);
  }
  @Post(":orgId/batches")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createBatch(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: BatchDto) {
    return this.svc.createBatch(p, orgId, dto as unknown as Record<string, unknown>);
  }

  // Zero-Typing AI draft + command bar (returns a reviewable draft, never posts)
  @Post(":orgId/ai/draft")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  aiDraft(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: AiDraftDto) {
    return this.svc.aiDraft(p, orgId, dto.command, dto.kind ?? "sales");
  }

  // ── Document engine (template-driven PDFs) ──────────────────────────
  /** The full catalog of document types the engine can generate (UI picker) — invoice family + report family. */
  @Get("doc-types")
  docTypes() {
    return [
      ...docCatalog(),
      ...REPORT_CATALOG.map((r) => ({ type: r.type, title: r.title, category: r.category, description: r.description, taxTable: false, postsToLedger: false, needsReference: false, report: true })),
    ];
  }

  /**
   * Render a report-style document (P&L, Balance Sheet, GST Summary, BHS report,
   * …) from structured sections the caller supplies. Streams the PDF; saves a
   * tracked record to the document center unless save=false.
   */
  @Post(":orgId/report-pdf")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ACCOUNTANT", "ADMIN")
  async reportPdf(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: ReportPdfDto, @Res() res: Response) {
    const { buffer, number } = await this.svc.renderReportPdf(p, orgId, dto);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${number}.pdf"` }).send(buffer);
  }

  /** List previously-generated documents (quotations, credit notes, vouchers…). */
  @Get(":orgId/documents")
  documents(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string) {
    return this.svc.listDocuments(p, orgId);
  }

  /** Stream a PDF (tax invoice etc.) for an existing sales invoice. */
  @Get(":orgId/sales/:id/pdf")
  async salesPdf(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string, @Query("type") type: string | undefined, @Res() res: Response) {
    const docType = (type && (DOC_TYPES as string[]).includes(type) ? type : "TAX_INVOICE") as DocType;
    const { buffer, number } = await this.svc.salesInvoicePdf(p, orgId, id, docType);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${number}.pdf"` }).send(buffer);
  }

  /** Create a new document (credit/debit note, quotation, PO, …) → { id, number }. */
  @Post(":orgId/documents")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  createDocument(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Body() dto: CreateDocDto) {
    return this.svc.createDocument(p, orgId, dto);
  }

  /** Full detail of one document incl. audit trail + approval history (timeline drawer). */
  @Get(":orgId/documents/:id/detail")
  documentDetail(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string) {
    return this.svc.documentDetail(p, orgId, id);
  }

  /** Stream a previously-created document's PDF. */
  @Get(":orgId/documents/:id/pdf")
  async documentPdf(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string, @Res() res: Response) {
    const { buffer, number } = await this.svc.documentPdf(p, orgId, id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${number}.pdf"` }).send(buffer);
  }

  /** Record a document action (APPROVED|REJECTED|SENT|DOWNLOADED|VIEWED|CANCELLED) → audit trail + lifecycle. */
  @Post(":orgId/documents/:id/action")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  documentAction(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string, @Body() dto: DocActionDto) {
    return this.svc.recordDocAction(p, orgId, id, dto.action, dto.meta);
  }

  /** Update a document's WhatsApp delivery status (PENDING|SENT|DELIVERED|FAILED). */
  @Post(":orgId/documents/:id/whatsapp-status")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  documentWhatsappStatus(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string, @Body() dto: WaStatusDto) {
    return this.svc.setDocWhatsappStatus(p, orgId, id, dto.status);
  }

  /** Duplicate a document → a fresh copy with a new number. */
  @Post(":orgId/documents/:id/duplicate")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  duplicateDocument(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string) {
    return this.svc.duplicateDocument(p, orgId, id);
  }

  /** Convert a document to another type (e.g. Quotation → Tax Invoice). */
  @Post(":orgId/documents/:id/convert")
  @Roles("BUSINESS_OWNER", "BUSINESS_USER", "ASSOCIATE", "ADMIN")
  convertDocument(@CurrentPrincipal() p: Principal, @Param("orgId") orgId: string, @Param("id") id: string, @Body() dto: ConvertDto) {
    return this.svc.convertDocument(p, orgId, id, dto.toType);
  }
}
