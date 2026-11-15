// ─────────────────────────────────────────────
// Server-side order pricing
//
// The client never decides prices or totals:
//   • item unit_price  ← Branch_Product." Pro_Price"
//   • tax rate         ← company tax settings (fixed on the order at creation)
//   • totals           ← calculated here from the stored order items
// The cashier may still enter a discount % and a service fee amount; those
// are validated and stored on the order, and the totals are derived from them.
//
// Formula (same as the cashier screen):
//   subtotal  = Σ item total_price
//   discount  = subtotal × or_discount_pct / 100
//   taxable   = subtotal − discount + or_service_fee + or_addons_price   → or_totalcost
//   tax       = taxable × or_tax / 100                                    → or_tax_amount
//   total     = taxable + tax                                             → or_totalCostWtax
// ─────────────────────────────────────────────

export const MAX_CHARGE_AMOUNT = 10_000_000;

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Validate the charge inputs a client may send. Only keys that are present
// are checked. Returns an error string or null.
export function validateOrderCharges({ or_discount_pct, or_service_fee, or_addons_price } = {}) {
  const has = (v) => v !== undefined && v !== null && v !== "";

  if (has(or_discount_pct)) {
    const n = Number(or_discount_pct);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return "or_discount_pct must be a number between 0 and 100";
    }
  }
  for (const [key, val] of [["or_service_fee", or_service_fee], ["or_addons_price", or_addons_price]]) {
    if (has(val)) {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0 || n > MAX_CHARGE_AMOUNT) {
        return `${key} must be a number between 0 and ${MAX_CHARGE_AMOUNT}`;
      }
    }
  }
  return null;
}

// Tax rate (%) that applies to new orders of a branch: the company's
// tax_rate when tax is enabled, otherwise 0.
export async function getBranchTaxRate(db, branchId) {
  const { rows } = await db.query(
    `SELECT c.tax_enabled, c.tax_rate
     FROM "Branch" b
     JOIN "Company" c ON c.com_id = b.com_id
     WHERE b."B_id" = $1`,
    [branchId],
  );
  if (!rows.length || !rows[0].tax_enabled) return 0;
  return Number(rows[0].tax_rate) || 0;
}

// Lock the order row for the rest of the transaction so concurrent item
// changes on the same order are applied one after another (the cashier
// screen adds all items in parallel). Returns the order row or null.
export async function lockOrder(db, orderId) {
  const { rows } = await db.query(
    `SELECT * FROM "ORDER" WHERE or_id = $1 FOR UPDATE`,
    [orderId],
  );
  return rows[0] ?? null;
}

// Recalculate and store an order's totals from its items.
// Must run inside the same transaction that changed the items/charges.
// Returns the updated order row.
export async function recalculateOrderTotals(db, orderId) {
  const { rows: [order] } = await db.query(
    `SELECT or_discount_pct, or_service_fee, or_addons_price, or_tax
     FROM "ORDER" WHERE or_id = $1`,
    [orderId],
  );
  if (!order) return null;

  const { rows: [sum] } = await db.query(
    `SELECT COALESCE(SUM(total_price), 0) AS subtotal
     FROM "ORDER_ITEM" WHERE order_id = $1`,
    [orderId],
  );

  const subtotal = round2(sum.subtotal);
  const discountPct = Number(order.or_discount_pct) || 0;
  const discount = round2((subtotal * discountPct) / 100);
  const taxable = round2(
    subtotal - discount + (Number(order.or_service_fee) || 0) + (Number(order.or_addons_price) || 0),
  );
  const taxRate = Number(order.or_tax) || 0;
  const tax = round2((taxable * taxRate) / 100);
  const total = round2(taxable + tax);

  const { rows } = await db.query(
    `UPDATE "ORDER"
     SET or_subtotal = $1, or_discount_amount = $2, or_totalcost = $3,
         or_tax_amount = $4, "or_totalCostWtax" = $5
     WHERE or_id = $6
     RETURNING *`,
    [subtotal, discount, taxable, tax, total, orderId],
  );
  return rows[0];
}
