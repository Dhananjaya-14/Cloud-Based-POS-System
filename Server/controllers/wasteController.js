import pool from "../config/database.js";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function isValidQty(value) {
  const n = Number(value);
  // NUMERIC(10,3) — max 9999999.999
  return Number.isFinite(n) && n > 0 && n <= 9999999.999;
}

function roundQty(value) {
  // Enforce max 3 decimal places to match NUMERIC(10,3)
  return Math.round(Number(value) * 1000) / 1000;
}

function isValidReason(value) {
  // Optional field but if provided must be a non-empty string under 255 chars
  if (value === undefined || value === null) return true;
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 255
  );
}

function toResponseRow(row) {
  return {
    waste_id: row.waste_id,
    rm_id: row.rm_id,
    rm_name: row.rm_name,
    waste_qty: parseFloat(row.waste_qty),
    reason: row.reason ?? null,
    recorded_at: row.recorded_at,
  };
}

// ─────────────────────────────────────────────
// POST /api/waste
// ─────────────────────────────────────────────
export const createWaste = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { rm_id, waste_qty, reason } = req.body;

    // ── Presence checks ──────────────────────
    if (rm_id === undefined || rm_id === null) {
      res.status(400);
      throw new Error("rm_id is required.");
    }
    if (waste_qty === undefined || waste_qty === null) {
      res.status(400);
      throw new Error("waste_qty is required.");
    }

    // ── Type / range checks ──────────────────
    if (!isPositiveInt(rm_id)) {
      res.status(400);
      throw new Error("rm_id must be a positive integer.");
    }
    if (!isValidQty(waste_qty)) {
      res.status(400);
      throw new Error(
        "waste_qty must be a positive number no greater than 9999999.999.",
      );
    }
    if (!isValidReason(reason)) {
      res.status(400);
      throw new Error(
        "reason must be a non-empty string under 255 characters.",
      );
    }

    const safeQty = roundQty(waste_qty);

    await client.query("BEGIN");

    // ── Raw material must exist ──────────────
    const rmCheck = await client.query(
      'SELECT "rm_id", "rm_name", "stock_qty" FROM "public"."Raw_Material" WHERE "rm_id" = $1',
      [rm_id],
    );
    if (rmCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404);
      throw new Error("Raw material not found.");
    }

    const currentStock = parseFloat(rmCheck.rows[0].stock_qty);

    // ── Business rule: can't waste more than you have ──
    if (safeQty > currentStock) {
      await client.query("ROLLBACK");
      res.status(400);
      throw new Error(
        `Insufficient stock. Current stock is ${currentStock}, attempted to waste ${safeQty}.`,
      );
    }

    // ── Business rule: can't waste 100% of stock without reason ──
    if (safeQty === currentStock && !reason?.trim()) {
      await client.query("ROLLBACK");
      res.status(400);
      throw new Error(
        "A reason is required when wasting the entire remaining stock.",
      );
    }

    // ── Insert waste record ──────────────────
    const wasteResult = await client.query(
      `INSERT INTO "public"."Waste" ("rm_id", "waste_qty", "reason", "recorded_at")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING "waste_id", "rm_id", "waste_qty", "reason", "recorded_at"`,
      [rm_id, safeQty, reason?.trim() ?? null],
    );

    // ── Reduce stock ─────────────────────────
    await client.query(
      'UPDATE "public"."Raw_Material" SET "stock_qty" = "stock_qty" - $1 WHERE "rm_id" = $2',
      [safeQty, rm_id],
    );

    await client.query("COMMIT");

    const newStock = currentStock - safeQty;
    const percentage = ((safeQty / currentStock) * 100).toFixed(2);

    res.status(201).json({
      message: "Waste recorded and stock updated.",
      data: {
        ...toResponseRow({
          ...wasteResult.rows[0],
          rm_name: rmCheck.rows[0].rm_name,
        }),
        stock_before: currentStock,
        stock_after: newStock,
        waste_percentage: `${percentage}%`,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// GET /api/waste
// ─────────────────────────────────────────────
export const getAllWaste = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        w."waste_id",
        w."rm_id",
        rm."rm_name",
        w."waste_qty",
        w."reason",
        w."recorded_at"
       FROM "public"."Waste" w
       JOIN "public"."Raw_Material" rm ON rm."rm_id" = w."rm_id"
       ORDER BY w."recorded_at" DESC`,
    );

    res.json(result.rows.map(toResponseRow));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/waste/percentage
// Dashboard: waste % per raw material
// ─────────────────────────────────────────────
export const getWastePercentage = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        rm."rm_id",
        rm."rm_name",
        rm."unit",
        ROUND(rm."stock_qty", 3)                          AS current_stock,
        COALESCE(ROUND(SUM(w."waste_qty"), 3), 0)         AS total_wasted,
        CASE
          WHEN (rm."stock_qty" + COALESCE(SUM(w."waste_qty"), 0)) > 0
          THEN ROUND(
            (COALESCE(SUM(w."waste_qty"), 0) /
            (rm."stock_qty" + COALESCE(SUM(w."waste_qty"), 0))) * 100
          , 2)
          ELSE 0
        END AS waste_percentage
       FROM "public"."Raw_Material" rm
       LEFT JOIN "public"."Waste" w ON w."rm_id" = rm."rm_id"
       GROUP BY rm."rm_id", rm."rm_name", rm."unit", rm."stock_qty"
       ORDER BY waste_percentage DESC`,
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET /api/waste/:id
// ─────────────────────────────────────────────
export const getWasteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid waste id.");
    }

    const result = await pool.query(
      `SELECT
        w."waste_id",
        w."rm_id",
        rm."rm_name",
        w."waste_qty",
        w."reason",
        w."recorded_at"
       FROM "public"."Waste" w
       JOIN "public"."Raw_Material" rm ON rm."rm_id" = w."rm_id"
       WHERE w."waste_id" = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Waste record not found.");
    }

    res.json(toResponseRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT /api/waste/:id
// Only quantity and reason can be updated.
// Stock is adjusted by the DIFFERENCE from old qty.
// recorded_at is intentionally NOT updated — it's the original event timestamp.
// ─────────────────────────────────────────────
export const updateWaste = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { waste_qty, reason } = req.body;

    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid waste id.");
    }

    // ── At least one field required ──────────
    if (waste_qty === undefined && reason === undefined) {
      res.status(400);
      throw new Error(
        "At least one field (waste_qty, reason) must be provided.",
      );
    }

    if (waste_qty !== undefined && !isValidQty(waste_qty)) {
      res.status(400);
      throw new Error(
        "waste_qty must be a positive number no greater than 9999999.999.",
      );
    }
    if (!isValidReason(reason)) {
      res.status(400);
      throw new Error(
        "reason must be a non-empty string under 255 characters.",
      );
    }

    await client.query("BEGIN");

    // ── Fetch existing record ────────────────
    const oldWaste = await client.query(
      `SELECT w."waste_id", w."rm_id", w."waste_qty", rm."stock_qty", rm."rm_name"
       FROM "public"."Waste" w
       JOIN "public"."Raw_Material" rm ON rm."rm_id" = w."rm_id"
       WHERE w."waste_id" = $1`,
      [id],
    );
    if (oldWaste.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404);
      throw new Error("Waste record not found.");
    }

    const old = oldWaste.rows[0];
    const oldQty = parseFloat(old.waste_qty);
    const currentStock = parseFloat(old.stock_qty);
    const safeNewQty = waste_qty !== undefined ? roundQty(waste_qty) : oldQty;
    const diff = safeNewQty - oldQty; // positive = more waste, negative = less waste

    // ── Business rule: increasing waste needs enough stock ──
    if (diff > 0 && diff > currentStock) {
      await client.query("ROLLBACK");
      res.status(400);
      throw new Error(
        `Insufficient stock to increase waste by ${diff}. Current stock is ${currentStock}.`,
      );
    }

    // ── Update waste record (recorded_at intentionally unchanged) ──
    const result = await client.query(
      `UPDATE "public"."Waste"
       SET
         "waste_qty" = $1,
         "reason"    = COALESCE($2, "reason")
       WHERE "waste_id" = $3
       RETURNING "waste_id", "rm_id", "waste_qty", "reason", "recorded_at"`,
      [safeNewQty, reason?.trim() ?? null, id],
    );

    // ── Adjust stock by difference ───────────
    if (diff !== 0) {
      await client.query(
        'UPDATE "public"."Raw_Material" SET "stock_qty" = "stock_qty" - $1 WHERE "rm_id" = $2',
        [diff, old.rm_id],
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Waste record updated and stock adjusted.",
      data: {
        ...toResponseRow({
          ...result.rows[0],
          rm_name: old.rm_name,
        }),
        stock_before: currentStock,
        stock_after: currentStock - diff,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// DELETE /api/waste/:id
// Restores wasted qty back to stock.
// ─────────────────────────────────────────────
export const deleteWaste = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid waste id.");
    }

    await client.query("BEGIN");

    // ── Fetch record before delete ───────────
    const wasteRecord = await client.query(
      'SELECT "rm_id", "waste_qty" FROM "public"."Waste" WHERE "waste_id" = $1',
      [id],
    );
    if (wasteRecord.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404);
      throw new Error("Waste record not found.");
    }

    const { rm_id, waste_qty } = wasteRecord.rows[0];
    const restoreQty = parseFloat(waste_qty);

    // ── Business rule: restored stock must not exceed NUMERIC(10,3) max ──
    const rmCheck = await client.query(
      'SELECT "stock_qty" FROM "public"."Raw_Material" WHERE "rm_id" = $1',
      [rm_id],
    );
    const currentStock = parseFloat(rmCheck.rows[0].stock_qty);
    if (currentStock + restoreQty > 9999999.999) {
      await client.query("ROLLBACK");
      res.status(400);
      throw new Error(
        "Cannot restore stock: restoring this waste would exceed the maximum stock limit.",
      );
    }

    // ── Restore stock ────────────────────────
    await client.query(
      'UPDATE "public"."Raw_Material" SET "stock_qty" = "stock_qty" + $1 WHERE "rm_id" = $2',
      [restoreQty, rm_id],
    );

    // ── Delete record ────────────────────────
    await client.query('DELETE FROM "public"."Waste" WHERE "waste_id" = $1', [
      id,
    ]);

    await client.query("COMMIT");

    res.json({
      message: "Waste record deleted and stock restored.",
      restored_qty: restoreQty,
      stock_after: currentStock + restoreQty,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};
