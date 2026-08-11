import pool from "../../../config/database.js";
import { ROLES } from "../../../middleware/authMiddleware.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), {
      status: 400,
    });
  }
  return parsed;
}

function sanitizeBody(body, allowedFields) {
  const sanitized = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      sanitized[field] =
        typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }
  return sanitized;
}

function parsePositiveDecimal(value, fieldName) {
  const parsed = Number(value);
  if (isNaN(parsed) || parsed <= 0) {
    throw Object.assign(
      new Error(`${fieldName} must be a positive number`),
      { status: 400 },
    );
  }
  return parsed;
}

const MAX_QTY        = 100_000;
const MAX_UNIT_PRICE = 999_999.99;

// ─── GET /api/purchase-items ──────────────────────────────────────────────────
export async function getPurchaseItems(req, res, next) {
  try {
    const { role_id, com_id, b_id } = req.user;
    let query = `SELECT
         pi.pi_id,
         pi.qty,
         pi.price,
         pi.unit_price,
         po.po_id,
         po.status      AS order_status,
         po.order_date,
         COALESCE(rm.rm_id, bp.pro_id) AS rm_id,
         COALESCE(rm.rm_name, bp.pro_name) AS rm_name,
         COALESCE(rm.unit, 'pcs') AS rm_unit,
         b."B_id"       AS branch_id,
         b."B_name"     AS branch_name,
         c.com_id       AS company_id,
         c.com_name     AS company_name
       FROM purchase_item pi
       JOIN purchase_order po ON po.po_id = pi.po_id
       JOIN "Branch"       b  ON b."B_id" = po.b_id
       JOIN "Company"      c  ON c.com_id = b.com_id
       LEFT JOIN "Raw_Material" rm ON rm.rm_id = pi.rm_id
       LEFT JOIN "Product" bp ON bp.pro_id = pi.pro_id`;
    
    const conditions = [];
    const params = [];

    if (role_id !== ROLES.SUPER_ADMIN) {
      conditions.push(`b.com_id = $${params.length + 1}`);
      params.push(com_id);

      if (b_id) {
        conditions.push(`po.b_id = $${params.length + 1}`);
        params.push(b_id);
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDER BY pi.pi_id ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-orders/:orderId/items ──────────────────────────────────
export async function getPurchaseItemsByOrder(req, res, next) {
  try {
    const orderId = parsePositiveInt(req.params.orderId, "po_id");
    const { role_id, com_id, b_id } = req.user;

    // Verify the parent purchase order exists and belongs to the company/branch
    let orderQuery = `
      SELECT po.po_id 
      FROM purchase_order po
      JOIN "Branch" b ON b."B_id" = po.b_id
      WHERE po.po_id = $1
    `;
    const orderParams = [orderId];

    if (role_id !== ROLES.SUPER_ADMIN) {
      orderQuery += ` AND b.com_id = $2`;
      orderParams.push(com_id);

      if (b_id) {
        orderQuery += ` AND po.b_id = $3`;
        orderParams.push(b_id);
      }
    }

    const orderCheck = await pool.query(orderQuery, orderParams);
    if (orderCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    const result = await pool.query(
      `SELECT
         pi.pi_id,
         pi.qty,
         pi.price,
         pi.unit_price,
         po.po_id,
         po.status      AS order_status,
         po.order_date,
         pi.rm_id,
         pi.pro_id,
         COALESCE(rm.rm_name, bp.pro_name) AS rm_name,
         COALESCE(rm.unit, 'pcs') AS rm_unit,
         b."B_id"       AS branch_id,
         b."B_name"     AS branch_name,
         c.com_id       AS company_id,
         c.com_name     AS company_name
       FROM purchase_item pi
       JOIN purchase_order po ON po.po_id = pi.po_id
       JOIN "Branch"       b  ON b."B_id" = po.b_id
       JOIN "Company"      c  ON c.com_id = b.com_id
       LEFT JOIN "Raw_Material" rm ON rm.rm_id = pi.rm_id
       LEFT JOIN "Product" bp ON bp.pro_id = pi.pro_id
       WHERE pi.po_id = $1
       ORDER BY pi.pi_id ASC`,
      [orderId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-items/:id ──────────────────────────────────────────────
export async function getPurchaseItemById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pi_id");
    const { role_id, com_id, b_id } = req.user;

    let query = `SELECT
         pi.pi_id,
         pi.qty,
         pi.price,
         pi.unit_price,
         po.po_id,
         po.status      AS order_status,
         po.order_date,
         pi.rm_id,
         pi.pro_id,
         COALESCE(rm.rm_name, bp.pro_name) AS rm_name,
         COALESCE(rm.unit, 'pcs') AS rm_unit,
         b."B_id"       AS branch_id,
         b."B_name"     AS branch_name,
         c.com_id       AS company_id,
         c.com_name     AS company_name
       FROM purchase_item pi
       JOIN purchase_order po ON po.po_id = pi.po_id
       JOIN "Branch"       b  ON b."B_id" = po.b_id
       JOIN "Company"      c  ON c.com_id = b.com_id
       LEFT JOIN "Raw_Material" rm ON rm.rm_id = pi.rm_id
       LEFT JOIN "Product" bp ON bp.pro_id = pi.pro_id
       WHERE pi.pi_id = $1`;
    const params = [id];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ` AND b.com_id = $2`;
      params.push(com_id);

      if (b_id) {
        query += ` AND po.b_id = $3`;
        params.push(b_id);
      }
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase item not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/purchase-items ─────────────────────────────────────────────────
export async function createPurchaseItem(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "po_id",
      "rm_id",
      "pro_id",
      "qty",
      "price",
      "unit_price",
    ]);

    const { po_id, rm_id, pro_id, qty, price, unit_price } = body;

    // ── Required fields ──
    // price/unit_price are intentionally NOT required here — the supplier's
    // actual cost isn't known until the order is received. They're entered
    // later via the receive flow (see purchaseOrderController.receiveWithWastage).
    if (
      po_id      === undefined ||
      (rm_id === undefined && pro_id === undefined) ||
      qty        === undefined
    ) {
      res.status(400);
      throw new Error("po_id, either rm_id or pro_id, and qty are required");
    }

    const parsedPoId  = parsePositiveInt(po_id,      "po_id");
    const parsedRmId  = rm_id ? parsePositiveInt(rm_id, "rm_id") : null;
    const parsedProId = pro_id ? parsePositiveInt(pro_id, "pro_id") : null;
    const parsedQty   = parsePositiveDecimal(qty,        "qty");

    if (parsedQty > MAX_QTY) {
      res.status(400);
      throw new Error(`qty cannot exceed ${MAX_QTY.toLocaleString()}`);
    }

    // Price fields are optional at creation time — validate only if provided
    // (e.g. for the rare case a price is already known upfront).
    let parsedPrice = null;
    let parsedUnitPrice = null;
    if (price !== undefined || unit_price !== undefined) {
      if (price === undefined || unit_price === undefined) {
        res.status(400);
        throw new Error("If providing a price, both price and unit_price are required together");
      }
      parsedPrice = parsePositiveDecimal(price, "price");
      parsedUnitPrice = parsePositiveDecimal(unit_price, "unit_price");

      if (parsedUnitPrice > MAX_UNIT_PRICE) {
        res.status(400);
        throw new Error(`unit_price cannot exceed ${MAX_UNIT_PRICE.toLocaleString()}`);
      }

      const expectedPrice = parsedQty * parsedUnitPrice;
      if (Math.abs(parsedPrice - expectedPrice) > 0.05) {
        res.status(400);
        throw new Error(
          `price (${parsedPrice}) does not match qty × unit_price (${expectedPrice.toFixed(2)})`,
        );
      }
    }

    // ── Purchase order existence, status & scoping check ──
    let orderQuery = `
      SELECT po.po_id, po.status 
      FROM purchase_order po
      JOIN "Branch" b ON b."B_id" = po.b_id
      WHERE po.po_id = $1
    `;
    const orderParams = [parsedPoId];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      orderQuery += ` AND b.com_id = $2`;
      orderParams.push(req.user.com_id);
      if (req.user.b_id) {
        orderQuery += ` AND po.b_id = $3`;
        orderParams.push(req.user.b_id);
      }
    }
    const orderCheck = await pool.query(orderQuery, orderParams);
    if (orderCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Purchase order with id ${parsedPoId} not found`);
    }
    if (orderCheck.rows[0].status === "received") {
      res.status(409);
      throw new Error(
        "Cannot add items to a purchase order that has already been received",
      );
    }

    // ── Item existence & scoping check ──
    if (parsedRmId) {
      let rmQuery = `SELECT rm_id FROM "Raw_Material" WHERE rm_id = $1`;
      const rmParams = [parsedRmId];
      if (req.user.role_id !== ROLES.SUPER_ADMIN) {
        rmQuery += ` AND "Com_id" = $2`;
        rmParams.push(req.user.com_id);
        if (req.user.b_id) {
          rmQuery += ` AND b_id = $3`;
          rmParams.push(req.user.b_id);
        }
      }
      const rmCheck = await pool.query(rmQuery, rmParams);
      if (rmCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Raw material with id ${parsedRmId} not found`);
      }
    } else if (parsedProId) {
      let proQuery = `SELECT pro_id FROM "Product" WHERE pro_id = $1`;
      const proParams = [parsedProId];
      const proCheck = await pool.query(proQuery, proParams);
      if (proCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Product with id ${parsedProId} not found`);
      }
    }

    // ── Duplicate item in same order ──
    let dupQuery = `SELECT pi_id FROM purchase_item WHERE po_id = $1 AND `;
    let dupParams = [parsedPoId];
    if (parsedRmId) {
      dupQuery += `rm_id = $2`;
      dupParams.push(parsedRmId);
    } else {
      dupQuery += `pro_id = $2`;
      dupParams.push(parsedProId);
    }
    const dupItem = await pool.query(dupQuery, dupParams);
    if (dupItem.rows.length > 0) {
      res.status(409);
      throw new Error(
        "This item is already listed in the purchase order — update the existing item instead",
      );
    }

    const result = await pool.query(
      `INSERT INTO purchase_item (po_id, rm_id, pro_id, qty, price, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING pi_id, po_id, rm_id, pro_id, qty, price, unit_price`,
      [parsedPoId, parsedRmId, parsedProId, parsedQty, parsedPrice, parsedUnitPrice],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/purchase-items/:id ──────────────────────────────────────────────
export async function updatePurchaseItem(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pi_id");
    const { role_id, com_id, b_id } = req.user;

    const body = sanitizeBody(req.body, [
      "po_id",
      "rm_id",
      "pro_id",
      "qty",
      "price",
      "unit_price",
    ]);

    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No fields provided to update");
    }

    const { po_id, rm_id, pro_id, qty, price, unit_price } = body;

    // ── Existence & Scoping check ──
    let existQuery = `
      SELECT pi.pi_id, pi.po_id, pi.rm_id, pi.qty, pi.unit_price, po.status AS order_status
      FROM purchase_item pi
      JOIN purchase_order po ON po.po_id = pi.po_id
      JOIN "Branch"       b  ON b."B_id" = po.b_id
      WHERE pi.pi_id = $1
    `;
    const existParams = [id];
    if (role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND b.com_id = $2`;
      existParams.push(com_id);
      if (b_id) {
        existQuery += ` AND po.b_id = $3`;
        existParams.push(b_id);
      }
    }
    const existing = await pool.query(existQuery, existParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase item not found");
    }

    const current = existing.rows[0];

    // ── Cannot edit items on a received order ──
    if (current.order_status === "received") {
      res.status(409);
      throw new Error(
        "Cannot edit items on a purchase order that has already been received",
      );
    }

    // ── FK validations ──
    if (po_id !== undefined) {
      const parsedPoId = parsePositiveInt(po_id, "po_id");
      let orderQuery = `
        SELECT po_id, status FROM purchase_order po
        JOIN "Branch" b ON b."B_id" = po.b_id
        WHERE po.po_id = $1
      `;
      const orderParams = [parsedPoId];
      if (role_id !== ROLES.SUPER_ADMIN) {
        orderQuery += ` AND b.com_id = $2`;
        orderParams.push(com_id);
        if (b_id) {
          orderQuery += ` AND po.b_id = $3`;
          orderParams.push(b_id);
        }
      }
      const orderCheck = await pool.query(orderQuery, orderParams);
      if (orderCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Purchase order with id ${parsedPoId} not found`);
      }
      if (orderCheck.rows[0].status === "received") {
        res.status(409);
        throw new Error("Cannot move item to a received purchase order");
      }
    }

    if (rm_id !== undefined || pro_id !== undefined) {
      const parsedRmId = rm_id !== undefined ? (rm_id ? parsePositiveInt(rm_id, "rm_id") : null) : current.rm_id;
      const parsedProId = pro_id !== undefined ? (pro_id ? parsePositiveInt(pro_id, "pro_id") : null) : current.pro_id;
      
      if (parsedRmId) {
        let rmQuery = `SELECT rm_id FROM "Raw_Material" WHERE rm_id = $1`;
        const rmParams = [parsedRmId];
        if (role_id !== ROLES.SUPER_ADMIN) {
          rmQuery += ` AND "Com_id" = $2`;
          rmParams.push(com_id);
          if (b_id) {
            rmQuery += ` AND b_id = $3`;
            rmParams.push(b_id);
          }
        }
        const rmCheck = await pool.query(rmQuery, rmParams);
        if (rmCheck.rows.length === 0) {
          res.status(404);
          throw new Error(`Raw material with id ${parsedRmId} not found`);
        }
      } else if (parsedProId) {
        let proQuery = `SELECT pro_id FROM "Product" WHERE pro_id = $1`;
        const proParams = [parsedProId];
        const proCheck = await pool.query(proQuery, proParams);
        if (proCheck.rows.length === 0) {
          res.status(404);
          throw new Error(`Product with id ${parsedProId} not found`);
        }
      }

      const resolvedPoId = po_id ? Number(po_id) : current.po_id;
      let dupQuery = `SELECT pi_id FROM purchase_item WHERE po_id = $1 AND pi_id <> $2 AND `;
      let dupParams = [resolvedPoId, id];
      if (parsedRmId) {
        dupQuery += `rm_id = $3`;
        dupParams.push(parsedRmId);
      } else {
        dupQuery += `pro_id = $3`;
        dupParams.push(parsedProId);
      }

      const dupItem = await pool.query(dupQuery, dupParams);
      if (dupItem.rows.length > 0) {
        res.status(409);
        throw new Error(
          "This item is already listed in the purchase order",
        );
      }
    }

    // ── Numeric validations ──
    const parsedQty       = qty        !== undefined ? parsePositiveDecimal(qty,        "qty")        : null;
    const parsedUnitPrice = unit_price !== undefined ? parsePositiveDecimal(unit_price, "unit_price") : null;
    const parsedPrice     = price      !== undefined ? parsePositiveDecimal(price,      "price")      : null;

    if (parsedQty !== null && parsedQty > MAX_QTY) {
      res.status(400);
      throw new Error(`qty cannot exceed ${MAX_QTY.toLocaleString()}`);
    }
    if (parsedUnitPrice !== null && parsedUnitPrice > MAX_UNIT_PRICE) {
      res.status(400);
      throw new Error(`unit_price cannot exceed ${MAX_UNIT_PRICE.toLocaleString()}`);
    }

    // ── Price consistency check ──
    const resolvedQty       = parsedQty       ?? Number(current.qty);
    const resolvedUnitPrice = parsedUnitPrice ?? Number(current.unit_price);
    if (parsedPrice !== null) {
      const expectedPrice = resolvedQty * resolvedUnitPrice;
      if (Math.abs(parsedPrice - expectedPrice) > 0.05) {
        res.status(400);
        throw new Error(
          `price (${parsedPrice}) does not match qty × unit_price (${expectedPrice.toFixed(2)})`,
        );
      }
    }

    const result = await pool.query(
      `UPDATE purchase_item
       SET
         po_id      = COALESCE($1, po_id),
         rm_id      = $2,
         pro_id     = $3,
         qty        = COALESCE($4, qty),
         price      = COALESCE($5, price),
         unit_price = COALESCE($6, unit_price)
       WHERE pi_id = $7
       RETURNING pi_id, po_id, rm_id, pro_id, qty, price, unit_price`,
      [
        po_id      ? Number(po_id) : null,
        rm_id !== undefined ? (rm_id ? Number(rm_id) : null) : current.rm_id,
        pro_id !== undefined ? (pro_id ? Number(pro_id) : null) : current.pro_id,
        parsedQty       ?? null,
        parsedPrice     ?? null,
        parsedUnitPrice ?? null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/purchase-items/:id ───────────────────────────────────────────
export async function deletePurchaseItem(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pi_id");
    const { role_id, com_id, b_id } = req.user;

    // ── Existence & Scoping check ──
    let existQuery = `
      SELECT pi.pi_id, po.status AS order_status
      FROM purchase_item pi
      JOIN purchase_order po ON po.po_id = pi.po_id
      JOIN "Branch"       b  ON b."B_id" = po.b_id
      WHERE pi.pi_id = $1
    `;
    const existParams = [id];
    if (role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND b.com_id = $2`;
      existParams.push(com_id);
      if (b_id) {
        existQuery += ` AND po.b_id = $3`;
        existParams.push(b_id);
      }
    }
    const existing = await pool.query(existQuery, existParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase item not found");
    }

    if (existing.rows[0].order_status === "received") {
      res.status(409);
      throw new Error(
        "Cannot delete items from a purchase order that has already been received",
      );
    }

    await pool.query(`DELETE FROM purchase_item WHERE pi_id = $1`, [id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
