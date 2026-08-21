export interface InvoiceItem {
  name: string;
  hsn?: string;
  qty: number;
  rate: number;
  taxRate?: number; // % GST, default 18
}

export interface Totals {
  items: Required<InvoiceItem>[];
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute a GST-correct invoice. Intra-state → CGST + SGST (split equally);
 * inter-state → IGST. Tax is per-line at each item's rate.
 */
export function computeTotals(items: InvoiceItem[], interState = false): Totals {
  let taxable = 0;
  let tax = 0;
  const normalized = items.map((it) => {
    const taxRate = it.taxRate ?? 18;
    const lineTaxable = r2((it.qty || 0) * (it.rate || 0));
    taxable += lineTaxable;
    tax += (lineTaxable * taxRate) / 100;
    return { name: it.name, hsn: it.hsn ?? "", qty: it.qty || 0, rate: it.rate || 0, taxRate };
  });
  taxable = r2(taxable);
  tax = r2(tax);
  const cgst = interState ? 0 : r2(tax / 2);
  const sgst = interState ? 0 : r2(tax - cgst);
  const igst = interState ? tax : 0;
  return { items: normalized, taxable, cgst, sgst, igst, total: r2(taxable + tax) };
}
