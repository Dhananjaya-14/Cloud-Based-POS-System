import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import { emitBranchProductEvent } from "../utils/socket.js";

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), { status: 400 });
  }
  return parsed;
}

function parsePositiveDecimal(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive number`), { status: 400 });
  }
  return parsed;
}

// ─── GET /api/returns ─────────────────────────────────────────────────────
export async function getAllReturns(req, res, next) {
  try {
    const { role_id, com_id, b_id } = req.user;

    let query = `
      SELECT
        r.return_id, r.po_id, r.rm_id, r.pro_id, r.qty_returned, r.reason,
        r.status, r.recorded_at, r.fulfilled_at,
        COALESCE(rm.rm_name, p.pro_name) AS item_name,
        COALESCE(rm.unit, 'pcs') AS unit,
        s.sup_id, s.sup_name
      FROM "Returns" r
      LEFT JOIN "Raw_Material" rm ON rm.rm_id = r.rm_id
      LEFT JOIN "Product" p ON p.pro_id = r.pro_id
      LEFT JOIN purchase_order po ON po.po_id = r.po_id
      LEFT JOIN "SUPPLIER" s ON s.sup_id = COALESCE(r.sup_id, po.sup_id)
      LEFT JOIN "Branch" b ON b."B_id" = r.b_id
    `;
    const conditions = [];
    const params = [];

    if (role_id !== ROLES.SUPER_ADMIN) {
      conditions.push(`b.com_id = $${params.length + 1}`);
      params.push(com_id);
      if (b_id) {
        conditions.push(`r.b_id = $${params.length + 1}`);
        params.push(b_id);
      }
    }

    if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY r.recorded_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/returns/:id — edit qty/reason/status ──────────────────────────
// Handles all transitions: pending qty edits, pending→fulfilled, fulfilled
// qty edits, and fulfilled→pending reverts — each with correct stock math.
export async function updateReturn(req, res, next) {
  const client = await pool.connect();
  try {
    const id = parsePositiveInt(req.params.id, "return_id");
    const { qty_returned, reason, status } = req.body;

    if (status !== undefined && !["pending", "fulfilled"].includes(status)) {
      res.status(400);
      throw new Error("status must be 'pending' or 'fulfilled'");
    }

    const existingRes = await pool.query(`SELECT * FROM "Returns" WHERE return_id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      res.status(404);
      throw new Error("Return record not found");
    }
    const existing = existingRes.rows[0];

    const oldQty = Number(existing.qty_returned);
    const newQty = qty_returned !== undefined
      ? parsePositiveDecimal(qty_returned, "qty_returned")
      : oldQty;
    const oldStatus = existing.status;
    const newStatus = status !== undefined ? status : oldStatus;

    await client.query("BEGIN");

    // delta > 0 adds to stock, delta < 0 subtracts (never goes below 0)
    const applyStockDelta = async (delta) => {
      if (delta === 0) return;
      if (existing.rm_id) {
        await client.query(
          `UPDATE "Raw_Material" SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) + $1) WHERE rm_id = $2`,
          [delta, existing.rm_id],
        );
      } else if (existing.pro_id) {
        const wholeDelta = Math.round(delta);
        if (wholeDelta !== 0) {
          await client.query(
            `UPDATE "Branch_Product" SET "pro_quantity" = GREATEST(0, COALESCE("pro_quantity", 0) + $1)
             WHERE "pro_id" = $2 AND "B_id" = $3`,
            [wholeDelta, existing.pro_id, existing.b_id],
          );
        }
      }
    };

    let fulfilledAt = existing.fulfilled_at;

    if (oldStatus === "pending" && newStatus === "pending") {
      // Qty edit only — returned units are excluded from stock while
      // pending. Increasing return qty means MORE units are bad, so
      // remove that extra amount from stock. Decreasing it adds the
      // difference back.
      const diff = newQty - oldQty;
      if (diff !== 0) await applyStockDelta(-diff);
    } else if (oldStatus === "pending" && newStatus === "fulfilled") {
      // Supplier delivered replacements — add the returned quantity to stock.
      await applyStockDelta(newQty);
      fulfilledAt = new Date();
    } else if (oldStatus === "fulfilled" && newStatus === "fulfilled") {
      // Already fulfilled, correcting quantity afterward — the difference
      // directly affects stock since the original qty is already in stock.
      const diff = newQty - oldQty;
      if (diff !== 0) await applyStockDelta(diff);
    } else if (oldStatus === "fulfilled" && newStatus === "pending") {
      // Reverting a fulfillment — remove the originally added quantity
      // from stock, going back to the "excluded from stock" state.
      await applyStockDelta(-oldQty);
      fulfilledAt = null;
    }

    const result = await client.query(
      `UPDATE "Returns"
       SET qty_returned = $1, reason = COALESCE($2, reason), status = $3, fulfilled_at = $4
       WHERE return_id = $5
       RETURNING *`,
      [newQty, reason ?? null, newStatus, fulfilledAt, id],
    );

    await client.query("COMMIT");

    if (existing.b_id) {
      emitBranchProductEvent(existing.b_id, "return:updated", {
        return_id: id,
        actor_id: req.user?.u_id
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// ─── DELETE /api/returns/:id — remove (any status) ──────────────────────────
// If the return was already fulfilled, its quantity is currently sitting in
// stock — that addition is reversed before the record is deleted.
export async function deleteReturn(req, res, next) {
  const client = await pool.connect();
  try {
    const id = parsePositiveInt(req.params.id, "return_id");

    const existingRes = await pool.query(`SELECT * FROM "Returns" WHERE return_id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      res.status(404);
      throw new Error("Return record not found");
    }
    const existing = existingRes.rows[0];

    await client.query("BEGIN");

    if (existing.status === "fulfilled") {
      const qty = Number(existing.qty_returned);
      if (existing.rm_id) {
        await client.query(
          `UPDATE "Raw_Material" SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) - $1) WHERE rm_id = $2`,
          [qty, existing.rm_id],
        );
      } else if (existing.pro_id) {
        const wholeQty = Math.round(qty);
        await client.query(
          `UPDATE "Branch_Product" SET "pro_quantity" = GREATEST(0, COALESCE("pro_quantity", 0) - $1)
           WHERE "pro_id" = $2 AND "B_id" = $3`,
          [wholeQty, existing.pro_id, existing.b_id],
        );
      }
    }

    await client.query(`DELETE FROM "Returns" WHERE return_id = $1`, [id]);
    await client.query("COMMIT");

    if (existing.b_id) {
      emitBranchProductEvent(existing.b_id, "return:deleted", {
        return_id: id,
        actor_id: req.user?.u_id
      });
    }

    res.status(204).send();
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// ─── POST /api/returns — manually record a return for existing stock ───────
export async function createReturn(req, res, next) {
  const client = await pool.connect();
  try {
    const { rm_id, pro_id, qty_returned, reason, sup_id } = req.body;
    const parsedSupId = sup_id ? parsePositiveInt(sup_id, "sup_id") : null;

    if (!rm_id && !pro_id) {
      res.status(400);
      throw new Error("Either rm_id or pro_id is required.");
    }
    if (rm_id && pro_id) {
      res.status(400);
      throw new Error("Provide only one of rm_id or pro_id, not both.");
    }

    const qty = parsePositiveDecimal(qty_returned, "qty_returned");
    const bId = req.user?.b_id || req.user?.B_id || null;
    if (!bId) {
      res.status(400);
      throw new Error("No branch associated with this user.");
    }

    await client.query("BEGIN");

    if (rm_id) {
      const parsedRmId = parsePositiveInt(rm_id, "rm_id");
      const rmCheck = await client.query(
        `SELECT stock_qty FROM "Raw_Material" WHERE rm_id = $1 AND b_id = $2`,
        [parsedRmId, bId],
      );
      if (rmCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404);
        throw new Error("Raw material not found in this branch.");
      }
      const currentStock = parseFloat(rmCheck.rows[0].stock_qty);
      if (qty > currentStock) {
        await client.query("ROLLBACK");
        res.status(400);
        throw new Error(`Cannot return ${qty} — only ${currentStock} in stock.`);
      }

      await client.query(
        `UPDATE "Raw_Material" SET stock_qty = GREATEST(0, stock_qty - $1) WHERE rm_id = $2`,
        [qty, parsedRmId],
      );
      await client.query(
        `INSERT INTO "Returns" (rm_id, qty_returned, reason, status, b_id, sup_id, recorded_at)
         VALUES ($1, $2, $3, 'pending', $4, $5, CURRENT_TIMESTAMP)`,
        [parsedRmId, qty, reason || null, bId, parsedSupId],
      );
    } else {
      const parsedProId = parsePositiveInt(pro_id, "pro_id");
      const bpCheck = await client.query(
        `SELECT "pro_quantity" FROM "Branch_Product" WHERE "pro_id" = $1 AND "B_id" = $2`,
        [parsedProId, bId],
      );
      if (bpCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404);
        throw new Error("Product not found in this branch.");
      }
      const currentStock = parseFloat(bpCheck.rows[0].pro_quantity);
      if (qty > currentStock) {
        await client.query("ROLLBACK");
        res.status(400);
        throw new Error(`Cannot return ${qty} — only ${currentStock} in stock.`);
      }

      const wholeQty = Math.round(qty);
      await client.query(
        `UPDATE "Branch_Product" SET "pro_quantity" = GREATEST(0, "pro_quantity" - $1) WHERE "pro_id" = $2 AND "B_id" = $3`,
        [wholeQty, parsedProId, bId],
      );
      await client.query(
        `INSERT INTO "Returns" (pro_id, qty_returned, reason, status, b_id, sup_id, recorded_at)
         VALUES ($1, $2, $3, 'pending', $4, $5, CURRENT_TIMESTAMP)`,
        [parsedProId, qty, reason || null, bId, parsedSupId],
      );
    }

    await client.query("COMMIT");

    if (bId) {
      emitBranchProductEvent(bId, "return:created", {
        actor_id: req.user?.u_id
      });
    }

    res.status(201).json({ message: "Return recorded and stock updated." });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}
