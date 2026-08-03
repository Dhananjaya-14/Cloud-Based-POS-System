import pool from "../../../config/database.js";

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
    rm_id: row.rm_id || null,
    pro_id: row.pro_id || null,
    rm_name: row.rm_name || null,
    pro_name: row.pro_name || null,
    unit: row.unit,
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
    const { rm_id, pro_id, waste_qty, reason, unit } = req.body;

    // ── Presence checks ──────────────────────
    if (!rm_id && !pro_id) {
      res.status(400);
      throw new Error("Either rm_id or pro_id is required.");
    }
    if (waste_qty === undefined || waste_qty === null) {
      res.status(400);
      throw new Error("waste_qty is required.");
    }

    // ── Type / range checks ──────────────────
    if (rm_id && !isPositiveInt(rm_id)) {
      res.status(400);
      throw new Error("rm_id must be a positive integer.");
    }
    if (pro_id && !isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("pro_id must be a positive integer.");
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
    const finalUnit = unit || 'pcs';
    const userBranchId = req.user?.b_id || req.user?.B_id || null;

    await client.query("BEGIN");

    let currentStock = 0;
    let itemName = "";
    
    if (rm_id) {
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
      currentStock = parseFloat(rmCheck.rows[0].stock_qty);
      itemName = rmCheck.rows[0].rm_name;
    } else if (pro_id) {
      // ── Product must exist ──────────────
      // For now, waste is recorded for products. We will reduce branch product quantity if needed, or global.
      // Waste table has pro_id, so we assume Branch_Product.
      const user = req.user; // Assuming requireAuth middleware adds user
      const b_id = user ? user.B_id : null; 
      
      let query = 'SELECT "pro_id", "pro_name", "pro_quantity" FROM "public"."Branch_Product" WHERE "pro_id" = $1';
      const params = [pro_id];
      
      if (b_id) {
        query += ' AND "B_id" = $2';
        params.push(b_id);
      }
      
      const proCheck = await client.query(query, params);
      
      if (proCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(404);
        throw new Error("Product not found in this branch.");
      }
      currentStock = parseFloat(proCheck.rows[0].pro_quantity);
      itemName = proCheck.rows[0].pro_name;
    }

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
      `INSERT INTO "public"."Waste" ("rm_id", "pro_id", "waste_qty", "reason", "recorded_at", "b_id")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
       RETURNING "waste_id", "rm_id", "pro_id", "waste_qty", "reason", "recorded_at"`,
      [rm_id || null, pro_id || null, safeQty, reason?.trim() ?? null, userBranchId],
    );

    // ── Reduce stock ─────────────────────────
    if (rm_id) {
      await client.query(
        'UPDATE "public"."Raw_Material" SET "stock_qty" = "stock_qty" - $1 WHERE "rm_id" = $2',
        [safeQty, rm_id],
      );
    } else if (pro_id) {
      const user = req.user;
      const b_id = user ? user.B_id : null;
      if (b_id) {
        await client.query(
          'UPDATE "public"."Branch_Product" SET "pro_quantity" = "pro_quantity" - $1 WHERE "pro_id" = $2 AND "B_id" = $3',
          [safeQty, pro_id, b_id],
        );
      } else {
        await client.query(
          'UPDATE "public"."Branch_Product" SET "pro_quantity" = "pro_quantity" - $1 WHERE "pro_id" = $2',
          [safeQty, pro_id],
        );
      }
    }

    await client.query("COMMIT");

    const newStock = currentStock - safeQty;
    const percentage = currentStock > 0 ? ((safeQty / currentStock) * 100).toFixed(2) : "0.00";

    res.status(201).json({
      message: "Waste recorded and stock updated.",
      data: {
        ...toResponseRow({
          ...wasteResult.rows[0],
          rm_name: rm_id ? itemName : null,
          pro_name: pro_id ? itemName : null,
          unit: finalUnit
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
    const userBranchId = req.user?.b_id || req.user?.B_id || null;

    let query = `SELECT
        w."waste_id",
        w."rm_id",
        w."pro_id",
        rm."rm_name",
        bp."pro_name",
        w."waste_qty",
        rm."unit" as rm_unit,
        w."reason",
        w."recorded_at"
       FROM "public"."Waste" w
       LEFT JOIN "public"."Raw_Material" rm ON rm."rm_id" = w."rm_id"
       LEFT JOIN "public"."Branch_Product" bp ON bp."pro_id" = w."pro_id"`;
      const params = [];

    if (userBranchId) {
      query += ` WHERE w."b_id" = $1`;
      params.push(userBranchId);
    }

    query += ` ORDER BY w."recorded_at" DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(r => ({
      ...toResponseRow(r),
      unit: r.rm_unit || 'pcs'
    })));
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
        w."pro_id",
        rm."rm_name",
        bp."pro_name",
        w."waste_qty",
        w."reason",
        w."recorded_at"
       FROM "public"."Waste" w
       LEFT JOIN "public"."Raw_Material" rm ON rm."rm_id" = w."rm_id"
       LEFT JOIN "public"."Branch_Product" bp ON bp."pro_id" = w."pro_id"
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

    if (waste_qty === undefined && reason === undefined) {
      res.status(400);
      throw new Error("At least one field (waste_qty, reason) must be provided.");
    }

    if (waste_qty !== undefined && !isValidQty(waste_qty)) {
      res.status(400);
      throw new Error("waste_qty must be a positive number no greater than 9999999.999.");
    }
    if (!isValidReason(reason)) {
      res.status(400);
      throw new Error("reason must be a non-empty string under 255 characters.");
    }

    await client.query("BEGIN");

    // Fetch existing record
    const oldWaste = await client.query(
      `SELECT w."waste_id", w."rm_id", w."pro_id", w."waste_qty", 
              rm."stock_qty" as rm_stock, rm."rm_name",
              bp."pro_quantity" as pro_stock, bp."pro_name", bp."B_id"
       FROM "public"."Waste" w
       LEFT JOIN "public"."Raw_Material" rm ON rm."rm_id" = w."rm_id"
       LEFT JOIN "public"."Branch_Product" bp ON bp."pro_id" = w."pro_id"
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
    const isRM = !!old.rm_id;
    const currentStock = parseFloat(isRM ? old.rm_stock : old.pro_stock);
    const safeNewQty = waste_qty !== undefined ? roundQty(waste_qty) : oldQty;
    const diff = safeNewQty - oldQty; 

    if (diff > 0 && diff > currentStock) {
      await client.query("ROLLBACK");
      res.status(400);
      throw new Error(`Insufficient stock to increase waste by ${diff}. Current stock is ${currentStock}.`);
    }

    const result = await client.query(
      `UPDATE "public"."Waste"
       SET "waste_qty" = $1, "reason" = COALESCE($2, "reason")
       WHERE "waste_id" = $3
       RETURNING "waste_id", "rm_id", "pro_id", "waste_qty", "reason", "recorded_at"`,
      [safeNewQty, reason?.trim() ?? null, id],
    );

    if (diff !== 0) {
      if (isRM) {
        await client.query(
          'UPDATE "public"."Raw_Material" SET "stock_qty" = "stock_qty" - $1 WHERE "rm_id" = $2',
          [diff, old.rm_id],
        );
      } else {
        await client.query(
          'UPDATE "public"."Branch_Product" SET "pro_quantity" = "pro_quantity" - $1 WHERE "pro_id" = $2 AND "B_id" = $3',
          [diff, old.pro_id, old.B_id],
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      message: "Waste record updated and stock adjusted.",
      data: {
        ...toResponseRow({
          ...result.rows[0],
          rm_name: old.rm_name,
          pro_name: old.pro_name,
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

    const wasteRecord = await client.query(
      'SELECT "rm_id", "pro_id", "waste_qty" FROM "public"."Waste" WHERE "waste_id" = $1',
      [id],
    );
    if (wasteRecord.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404);
      throw new Error("Waste record not found.");
    }

    const { rm_id, pro_id, waste_qty } = wasteRecord.rows[0];
    const restoreQty = parseFloat(waste_qty);
    let currentStock = 0;

    if (rm_id) {
      const rmCheck = await client.query(
        'SELECT "stock_qty" FROM "public"."Raw_Material" WHERE "rm_id" = $1',
        [rm_id],
      );
      currentStock = parseFloat(rmCheck.rows[0].stock_qty);
      if (currentStock + restoreQty > 9999999.999) {
        await client.query("ROLLBACK");
        res.status(400);
        throw new Error("Cannot restore stock: restoring this waste would exceed the maximum limit.");
      }
      await client.query(
        'UPDATE "public"."Raw_Material" SET "stock_qty" = "stock_qty" + $1 WHERE "rm_id" = $2',
        [restoreQty, rm_id],
      );
    } else if (pro_id) {
      const user = req.user;
      const b_id = user ? user.B_id : null;
      let query = 'SELECT "pro_quantity" FROM "public"."Branch_Product" WHERE "pro_id" = $1';
      const params = [pro_id];
      if (b_id) {
        query += ' AND "B_id" = $2';
        params.push(b_id);
      }
      const proCheck = await client.query(query, params);
      
      if (proCheck.rows.length > 0) {
        currentStock = parseFloat(proCheck.rows[0].pro_quantity);
        if (currentStock + restoreQty > 9999999.999) {
          await client.query("ROLLBACK");
          res.status(400);
          throw new Error("Cannot restore stock: limit exceeded.");
        }
        
        let updateQuery = 'UPDATE "public"."Branch_Product" SET "pro_quantity" = "pro_quantity" + $1 WHERE "pro_id" = $2';
        if (b_id) {
          updateQuery += ' AND "B_id" = $3';
        }
        await client.query(updateQuery, [restoreQty, ...params]);
      }
    }

    await client.query('DELETE FROM "public"."Waste" WHERE "waste_id" = $1', [id]);
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
