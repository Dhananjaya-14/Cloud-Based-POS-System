import pool from "../../../config/database.js";
import { ROLES } from "../../../middleware/authMiddleware.js";
import { emitBranchProductEvent, SOCKET_EVENTS } from "../../../utils/socket.js";

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

const VALID_STATUSES = ["pending", "received"];

// ─── GET /api/purchase-orders ─────────────────────────────────────────────────
// ─── GET /api/purchase-orders ─────────────────────────────────────────────────
export async function getPurchaseOrders(req, res, next) {
  try {
    const { role_id, com_id, b_id } = req.user;
    let query = `SELECT
         po.po_id,
         po.status,
         po.order_date,
         po.received_date,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         b."B_id",
         b."B_name"
       FROM purchase_order po
       JOIN "SUPPLIER" s ON s.sup_id = po.sup_id
       JOIN "Branch"   b ON b."B_id" = po.b_id`;

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

    query += ` ORDER BY po.order_date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-orders/supplier/:supId ────────────────────────────────
export async function getPurchaseOrdersBySupplier(req, res, next) {
  try {
    const supId = parsePositiveInt(req.params.supId, "sup_id");
    const { role_id, com_id, b_id } = req.user;

    // Verify supplier exists and belongs to company
    let supQuery = `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`;
    const supParams = [supId];
    if (role_id !== ROLES.SUPER_ADMIN) {
      supQuery += ` AND "Com_id" = $2`;
      supParams.push(com_id);
    }
    const supCheck = await pool.query(supQuery, supParams);
    if (supCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Supplier not found`);
    }

    let query = `SELECT
         po.po_id,
         po.status,
         po.order_date,
         po.received_date,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         b."B_id",
         b."B_name"
       FROM purchase_order po
       JOIN "SUPPLIER" s ON s.sup_id = po.sup_id
       JOIN "Branch"   b ON b."B_id" = po.b_id
       WHERE po.sup_id = $1`;
    const params = [supId];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ` AND b.com_id = $2`;
      params.push(com_id);

      if (b_id) {
        query += ` AND po.b_id = $3`;
        params.push(b_id);
      }
    }

    query += ` ORDER BY po.order_date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-orders/:id ─────────────────────────────────────────────
export async function getPurchaseOrderById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");
    const { role_id, com_id, b_id } = req.user;

    let query = `SELECT
         po.po_id,
         po.status,
         po.order_date,
         po.received_date,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         b."B_id",
         b."B_name"
       FROM purchase_order po
       JOIN "SUPPLIER" s ON s.sup_id = po.sup_id
       JOIN "Branch"   b ON b."B_id" = po.b_id
       WHERE po.po_id = $1`;
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
      throw new Error("Purchase order not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/purchase-orders ────────────────────────────────────────────────
export async function createPurchaseOrder(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "sup_id",
      "B_id",
      "status",
      "order_date",
      "received_date",
    ]);

    const { sup_id, B_id, status, order_date, received_date } = body;

    // ── Required fields ──
    if (sup_id === undefined || B_id === undefined) {
      res.status(400);
      throw new Error("sup_id and B_id are required");
    }

    const parsedSupId = parsePositiveInt(sup_id, "sup_id");
    const parsedBId   = parsePositiveInt(B_id,   "B_id");

    // ── Status validation ──
    const resolvedStatus = status ?? "pending";
    if (!VALID_STATUSES.includes(resolvedStatus)) {
      res.status(400);
      throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    // ── received_date only allowed when status is 'received' ──
    if (received_date && resolvedStatus !== "received") {
      res.status(400);
      throw new Error("received_date can only be set when status is 'received'");
    }

    // ── Date format validation ──
    if (order_date && isNaN(Date.parse(order_date))) {
      res.status(400);
      throw new Error("order_date is not a valid date");
    }
    if (received_date && isNaN(Date.parse(received_date))) {
      res.status(400);
      throw new Error("received_date is not a valid date");
    }

    // ── received_date cannot be before order_date ──
    if (order_date && received_date) {
      if (new Date(received_date) < new Date(order_date)) {
        res.status(400);
        throw new Error("received_date cannot be before order_date");
      }
    }

    // ── Supplier existence & scoping check ──
    let supQuery = `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`;
    const supParams = [parsedSupId];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      supQuery += ` AND "Com_id" = $2`;
      supParams.push(req.user.com_id);
    }
    const supCheck = await pool.query(supQuery, supParams);
    if (supCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Supplier with id ${parsedSupId} not found`);
    }

    // ── Branch existence & scoping check ──
    let branchQuery = `SELECT "B_id" FROM "Branch" WHERE "B_id" = $1`;
    const branchParams = [parsedBId];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      branchQuery += ` AND "com_id" = $2`;
      branchParams.push(req.user.com_id);
    }
    const branchCheck = await pool.query(branchQuery, branchParams);
    if (branchCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Branch with id ${parsedBId} not found`);
    }

    const result = await pool.query(
      `INSERT INTO purchase_order (sup_id, b_id, status, order_date, received_date)
       VALUES ($1, $2, $3, COALESCE($4::TIMESTAMP, CURRENT_TIMESTAMP), $5::TIMESTAMP)
       RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
      [
        parsedSupId,
        parsedBId,
        resolvedStatus,
        order_date    || null,
        received_date || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/purchase-orders/:id ─────────────────────────────────────────────
export async function updatePurchaseOrder(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");

    const body = sanitizeBody(req.body, [
      "sup_id",
      "B_id",
      "status",
      "order_date",
      "received_date",
    ]);

    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No fields provided to update");
    }

    const { sup_id, B_id, status, order_date, received_date } = body;

    // ── Existence & Scoping check ──
    let existQuery = `
      SELECT po.po_id, po.status, po.order_date 
      FROM purchase_order po
      JOIN "Branch" b ON b."B_id" = po.b_id
      WHERE po.po_id = $1
    `;
    const existParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND b.com_id = $2`;
      existParams.push(req.user.com_id);
      if (req.user.b_id) {
        existQuery += ` AND po.b_id = $3`;
        existParams.push(req.user.b_id);
      }
    }
    const existing = await pool.query(existQuery, existParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    const currentStatus    = existing.rows[0].status;
    const currentOrderDate = existing.rows[0].order_date;

    // ── Cannot edit a received order ──
    if (currentStatus === "received" && status && status !== "received") {
      res.status(409);
      throw new Error("Cannot revert a received purchase order back to pending");
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const resolvedStatus = status ?? currentStatus;
    if (received_date && resolvedStatus !== "received") {
      res.status(400);
      throw new Error("received_date can only be set when status is 'received'");
    }

    if (order_date && isNaN(Date.parse(order_date))) {
      res.status(400);
      throw new Error("order_date is not a valid date");
    }
    if (received_date && isNaN(Date.parse(received_date))) {
      res.status(400);
      throw new Error("received_date is not a valid date");
    }

    const resolvedOrderDate = order_date
      ? new Date(order_date)
      : new Date(currentOrderDate);
    if (received_date && new Date(received_date) < resolvedOrderDate) {
      res.status(400);
      throw new Error("received_date cannot be before order_date");
    }

    // ── FK validations ──
    if (sup_id !== undefined) {
      const parsedSupId = parsePositiveInt(sup_id, "sup_id");
      let supQuery = `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`;
      const supParams = [parsedSupId];
      if (req.user.role_id !== ROLES.SUPER_ADMIN) {
        supQuery += ` AND "Com_id" = $2`;
        supParams.push(req.user.com_id);
      }
      const supCheck = await pool.query(supQuery, supParams);
      if (supCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Supplier with id ${parsedSupId} not found`);
      }
    }

    if (B_id !== undefined) {
      const parsedBId = parsePositiveInt(B_id, "B_id");
      let branchQuery = `SELECT "B_id" FROM "Branch" WHERE "B_id" = $1`;
      const branchParams = [parsedBId];
      if (req.user.role_id !== ROLES.SUPER_ADMIN) {
        branchQuery += ` AND "com_id" = $2`;
        branchParams.push(req.user.com_id);
      }
      const branchCheck = await pool.query(branchQuery, branchParams);
      if (branchCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Branch with id ${parsedBId} not found`);
      }
    }

    const result = await pool.query(
      `UPDATE purchase_order
       SET
         sup_id        = COALESCE($1, sup_id),
         b_id          = COALESCE($2, b_id),
         status        = COALESCE($3, status),
         order_date    = COALESCE($4::TIMESTAMP, order_date),
         received_date = COALESCE($5::TIMESTAMP, received_date)
       WHERE po_id = $6
       RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
      [
        sup_id        ? Number(sup_id) : null,
        B_id          ? Number(B_id)   : null,
        status        ?? null,
        order_date    || null,
        received_date || null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// // ─── PATCH /api/purchase-orders/:id/status ───────────────────────────────────
// export async function updatePurchaseOrderStatus(req, res, next) {
//   try {
//     const id = parsePositiveInt(req.params.id, "po_id");

//     const body = sanitizeBody(req.body, ["status"]);
//     const { status } = body;

//     if (!status) {
//       res.status(400);
//       throw new Error("status is required");
//     }

//     if (!VALID_STATUSES.includes(status)) {
//       res.status(400);
//       throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
//     }

//     // ── Existence & Scoping check ──
//     let existQuery = `
//       SELECT po.po_id, po.status 
//       FROM purchase_order po
//       JOIN "Branch" b ON b."B_id" = po.b_id
//       WHERE po.po_id = $1
//     `;
//     const existParams = [id];
//     if (req.user.role_id !== ROLES.SUPER_ADMIN) {
//       existQuery += ` AND b.com_id = $2`;
//       existParams.push(req.user.com_id);
//       if (req.user.b_id) {
//         existQuery += ` AND po.b_id = $3`;
//         existParams.push(req.user.b_id);
//       }
//     }
//     const existing = await pool.query(existQuery, existParams);
//     if (existing.rows.length === 0) {
//       res.status(404);
//       throw new Error("Purchase order not found");
//     }

//     const currentStatus = existing.rows[0].status;

//     if (currentStatus === "received" && status !== "received") {
//       res.status(409);
//       throw new Error("Cannot revert a received purchase order back to pending");
//     }

//     if (currentStatus === status) {
//       res.status(409);
//       throw new Error(`Purchase order is already '${status}'`);
//     }

//     if (status === "received") {
//       const itemCheck = await pool.query(
//         `SELECT pi_id FROM purchase_item WHERE po_id = $1 LIMIT 1`,
//         [id],
//       );
//       if (itemCheck.rows.length === 0) {
//         res.status(422);
//         throw new Error(
//           "Cannot mark order as received — no purchase items exist for this order",
//         );
//       }
//     }

//     const result = await pool.query(
//       `UPDATE purchase_order
//        SET
//          status        = $1::VARCHAR,
//          received_date = CASE WHEN $1::VARCHAR = 'received' THEN CURRENT_TIMESTAMP ELSE received_date END
//        WHERE po_id = $2
//        RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
//       [status, id],
//     );

//     res.json(result.rows[0]);
//   } catch (err) {
//     next(err);
//   }
// }



export async function updatePurchaseOrderStatus(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");

    const body = sanitizeBody(req.body, ["status"]);
    const { status } = body;

    if (!status) {
      res.status(400);
      throw new Error("status is required");
    }

    if (!VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    // ── Existence & Scoping check ──
    let existQuery = `
      SELECT po.po_id, po.status, po.b_id
      FROM purchase_order po
      JOIN "Branch" b ON b."B_id" = po.b_id
      WHERE po.po_id = $1
    `;
    const existParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND b.com_id = $2`;
      existParams.push(req.user.com_id);
      if (req.user.b_id) {
        existQuery += ` AND po.b_id = $3`;
        existParams.push(req.user.b_id);
      }
    }
    const existing = await pool.query(existQuery, existParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    const currentStatus = existing.rows[0].status;
    const poBranchId = existing.rows[0].b_id;

    if (currentStatus === "received" && status !== "received") {
      res.status(409);
      throw new Error("Cannot revert a received purchase order back to pending");
    }

    if (currentStatus === status) {
      res.status(409);
      throw new Error(`Purchase order is already '${status}'`);
    }

    // If marking as received, ensure there is at least one purchase_item
    if (status === "received") {
      const itemCheck = await pool.query(
        `SELECT pi_id FROM purchase_item WHERE po_id = $1 LIMIT 1`,
        [id],
      );
      if (itemCheck.rows.length === 0) {
        res.status(422);
        throw new Error(
          "Cannot mark order as received — no purchase items exist for this order",
        );
      }
    }

    // Perform the status update and stock adjustments in a single transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // If the target status is 'received', add each purchase_item.qty to the corresponding Raw_Material.stock_qty or Branch_Product.stock
      if (status === "received") {
        const items = await client.query(
          `SELECT rm_id, pro_id, qty FROM purchase_item WHERE po_id = $1`,
          [id],
        );

        // Update each stock
        for (const it of items.rows) {
          const adjQty = Number(it.qty) || 0;
          if (adjQty === 0) continue;

          if (it.rm_id) {
            const updateRes = await client.query(
              `UPDATE "Raw_Material"
               SET stock_qty = COALESCE(stock_qty, 0) + $1
               WHERE rm_id = $2
               RETURNING rm_id`,
              [adjQty, it.rm_id],
            );

            if (updateRes.rows.length === 0) {
              await client.query("ROLLBACK");
              res.status(404);
              throw new Error(`Raw material with id ${it.rm_id} not found`);
            }
          } else if (it.pro_id) {
            const updateRes = await client.query(
              `UPDATE "Branch_Product"
               SET "pro_quantity" = COALESCE("pro_quantity", 0) + $1
               WHERE "pro_id" = $2 AND "B_id" = $3
               RETURNING "Bpro_id", "pro_quantity"`,
              [adjQty, it.pro_id, poBranchId],
            );

            if (updateRes.rows.length === 0) {
              await client.query("ROLLBACK");
              res.status(404);
              throw new Error(`Product with id ${it.pro_id} not found in this branch`);
            }

            // Emit real-time update so POS and Product Management pages refresh instantly
            emitBranchProductEvent(poBranchId, SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, {
              branch_product: {
                Bpro_id: updateRes.rows[0].Bpro_id,
                pro_id: it.pro_id,
                pro_quantity: updateRes.rows[0].pro_quantity,
              }
            });
          }
        }
      }

      // Update purchase_order status + received_date
      const result = await client.query(
        `UPDATE purchase_order
         SET
           status        = $1::VARCHAR,
           received_date = CASE WHEN $1::VARCHAR = 'received' THEN CURRENT_TIMESTAMP ELSE received_date END
         WHERE po_id = $2
         RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
        [status, id],
      );

      await client.query("COMMIT");
      res.json(result.rows[0]);
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}// ─── POST /api/purchase-orders/:id/receive ──────────────────────────────────────
// ─── POST /api/purchase-orders/:id/receive ──────────────────────────────────────
// Body: { items: [{ rm_id?, pro_id?, waste_qty?, waste_reason?, return_qty?, return_reason? }] }
export async function receiveWithWastage(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");
    const { items: itemAdjustments = [] } = req.body;
    const { b_id, role_id, com_id } = req.user;

    // ── Existence & Scoping check ──
    let existQuery = `
      SELECT po.po_id, po.status, po.b_id
      FROM purchase_order po
      JOIN "Branch" b ON b."B_id" = po.b_id
      WHERE po.po_id = $1
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
      throw new Error("Purchase order not found");
    }

    const currentStatus = existing.rows[0].status;
    const poBranchId = existing.rows[0].b_id;

    if (currentStatus === "received") {
      res.status(409);
      throw new Error("Purchase order is already received");
    }

    // Perform the status update, stock adjustments, waste, and return records in a single transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const items = await client.query(
        `SELECT rm_id, pro_id, qty FROM purchase_item WHERE po_id = $1`,
        [id],
      );

      if (items.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(422);
        throw new Error(
          "Cannot mark order as received — no purchase items exist for this order",
        );
      }

      // Map incoming per-item adjustments for quick lookup
      const adjustmentMap = {};
      for (const adj of itemAdjustments) {
        if (adj.rm_id) adjustmentMap['rm_' + adj.rm_id] = adj;
        else if (adj.pro_id) adjustmentMap['pro_' + adj.pro_id] = adj;
      }

      // Waste and Return both apply to raw materials AND external/pre-made products.
      for (const it of items.rows) {
        const grossQty = Number(it.qty) || 0;
        const key = it.rm_id ? 'rm_' + it.rm_id : 'pro_' + it.pro_id;
        const adj = adjustmentMap[key] || {};
        const wasteQty = Number(adj.waste_qty) || 0;
        const returnQty = Number(adj.return_qty) || 0;
        const netQty = grossQty - wasteQty - returnQty;

        if (netQty < 0) {
          await client.query("ROLLBACK");
          res.status(400);
          throw new Error(
            `Waste + Return quantity cannot exceed ordered quantity for item`,
          );
        }

        // Add net quantity to stock
        if (netQty > 0) {
          if (it.rm_id) {
            const updateRes = await client.query(
              `UPDATE "Raw_Material"
               SET stock_qty = COALESCE(stock_qty, 0) + $1
               WHERE rm_id = $2
               RETURNING rm_id`,
              [netQty, it.rm_id],
            );

            if (updateRes.rows.length === 0) {
              await client.query("ROLLBACK");
              res.status(404);
              throw new Error(`Raw material with id ${it.rm_id} not found`);
            }
          } else if (it.pro_id) {
            const updateRes = await client.query(
              `UPDATE "Branch_Product"
               SET "pro_quantity" = COALESCE("pro_quantity", 0) + $1
               WHERE "pro_id" = $2 AND "B_id" = $3
               RETURNING "Bpro_id", "pro_quantity"`,
              [netQty, it.pro_id, poBranchId],
            );

            if (updateRes.rows.length === 0) {
              await client.query("ROLLBACK");
              res.status(404);
              throw new Error(`Product with id ${it.pro_id} not found in this branch`);
            }

            emitBranchProductEvent(poBranchId, SOCKET_EVENTS.BRANCH_PRODUCT_UPDATED, {
              branch_product: {
                Bpro_id: updateRes.rows[0].Bpro_id,
                pro_id: it.pro_id,
                pro_quantity: updateRes.rows[0].pro_quantity,
              }
            });
          }
        }

        // Insert waste record — staff-caused loss, applies to both rm_id and pro_id
        if (wasteQty > 0) {
          await client.query(
            `INSERT INTO "public"."Waste" ("rm_id", "pro_id", "waste_qty", "reason", "recorded_at", "b_id", "po_id", "gross_received", "net_received", "wastage_type", "wastage_value")
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, 'fixed', $9)`,
            [
              it.rm_id || null,
              it.pro_id || null,
              wasteQty,
              adj.waste_reason || `Damaged during delivery (PO #${id})`,
              poBranchId,
              id,
              grossQty,
              netQty,
              wasteQty,
            ]
          );
        }

        // Insert return record — supplier-caused, applies to both rm_id and pro_id
        // Stock is NOT added for returned qty until fulfilled via /api/returns/:id/fulfill
        if (returnQty > 0) {
          await client.query(
            `INSERT INTO "public"."Returns" ("rm_id", "pro_id", "po_id", "qty_returned", "reason", "status", "b_id", "recorded_at")
             VALUES ($1, $2, $3, $4, $5, 'pending', $6, CURRENT_TIMESTAMP)`,
            [
              it.rm_id || null,
              it.pro_id || null,
              id,
              returnQty,
              adj.return_reason || `Returned to supplier (PO #${id})`,
              poBranchId,
            ]
          );
        }
      }

      // Update purchase_order status + received_date
      const result = await client.query(
        `UPDATE purchase_order
         SET
           status        = 'received',
           received_date = CURRENT_TIMESTAMP
         WHERE po_id = $1
         RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
        [id],
      );

      await client.query("COMMIT");
      res.json(result.rows[0]);
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/purchase-orders/:id ─────────────────────────────────────────
export async function deletePurchaseOrder(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");

    // ── Existence & Scoping check ──
    let existQuery = `
      SELECT po.po_id, po.status 
      FROM purchase_order po
      JOIN "Branch" b ON b."B_id" = po.b_id
      WHERE po.po_id = $1
    `;
    const existParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND b.com_id = $2`;
      existParams.push(req.user.com_id);
      if (req.user.b_id) {
        existQuery += ` AND po.b_id = $3`;
        existParams.push(req.user.b_id);
      }
    }
    const existing = await pool.query(existQuery, existParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    if (existing.rows[0].status === "received") {
      res.status(409);
      throw new Error("Cannot delete a received purchase order");
    }

    // ── Cascade-safe: delete items first, then order ──
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM purchase_item  WHERE po_id = $1`, [id]);
      await client.query(`DELETE FROM purchase_order WHERE po_id = $1`, [id]);
      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error("Cannot delete purchase order because it is referenced elsewhere"),
      );
    }
    next(err);
  }
}
