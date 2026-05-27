import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";

const VALID_UNITS = ["kg", "g", "l", "ml", "pcs", "units", "box", "pack"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function isValidQuantity(value) {
  const n = Number(value);
  // Must be positive, finite, and within NUMERIC(8,3) range
  // Max: 99999.999 — covers kg, litres, grams, units in a real kitchen
  return Number.isFinite(n) && n > 0 && n <= 99999.999;
}

function roundQuantity(value) {
  // Enforce max 3 decimal places to match NUMERIC(8, 3)
  return Math.round(Number(value) * 1000) / 1000;
}

function fieldOrNull(value) {
  return value === undefined ? null : value;
}

function toResponseRow(row) {
  return {
    recipe_id: row.recipe_id,
    quantity_req: parseFloat(row.quantity_req), // return as number, not string
    pro_id: row.pro_id,
    rawmaterial_id: row.rawmaterial_id,
    // enriched fields (present only in getRecipesByProduct)
    ...(row.rm_name !== undefined && { rm_name: row.rm_name }),
    rm_unit: row.rm_unit || row.unit || "",
    ...(row.pro_name !== undefined && { pro_name: row.pro_name }),
  };
}

// ─────────────────────────────────────────────
// GET /api/recipes
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// GET /api/recipes
// ─────────────────────────────────────────────
export async function getRecipes(req, res, next) {
  try {
    const { role_id, com_id } = req.user;
    let query = `SELECT
        r."recipe_id",
        r."quantity_req",
        r."pro_id",
        r."rawmaterial_ID" AS "rawmaterial_id",
        p."pro_name",
        rm."rm_name",
        COALESCE(r."unit", rm."unit") AS "rm_unit" 
      FROM "public"."RECIPE" r
      JOIN "public"."Product"      p  ON p."pro_id"  = r."pro_id"
      JOIN "public"."Raw_Material" rm ON rm."rm_id"  = r."rawmaterial_ID"`;
    const params = [];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ` WHERE p."Com_id" = $1`;
      params.push(com_id);
    }

    query += ` ORDER BY r."pro_id", r."recipe_id"`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(toResponseRow));
  } catch (err) {
    next(err);
  }
}

// ─── ──────────────────────────────────────────
// GET /api/recipes/:id
// ─────────────────────────────────────────────
export async function getRecipeById(req, res, next) {
  try {
    const { id } = req.params;
    const { role_id, com_id } = req.user;

    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid recipe id.");
    }

    let query = `SELECT
        r."recipe_id",
        r."quantity_req",
        r."pro_id",
        r."rawmaterial_ID" AS "rawmaterial_id",
        p."pro_name",
        rm."rm_name",
        COALESCE(r."unit", rm."unit") AS "rm_unit" 
      FROM "public"."RECIPE" r
      JOIN "public"."Product"      p  ON p."pro_id" = r."pro_id"
      JOIN "public"."Raw_Material" rm ON rm."rm_id" = r."rawmaterial_ID"
      WHERE r."recipe_id" = $1`;
    const params = [id];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ` AND p."Com_id" = $2`;
      params.push(com_id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Recipe not found.");
    }

    res.json(toResponseRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
}

// ─── ──────────────────────────────────────────
// GET /api/recipes/product/:pro_id
// All ingredients for a specific product
// ─── ──────────────────────────────────────────
export async function getRecipesByProduct(req, res, next) {
  try {
    const { pro_id } = req.params;
    const { role_id, com_id } = req.user;

    if (!isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("Invalid pro_id.");
    }

    // Verify product exists first and belongs to the company
    let prodQuery = 'SELECT "pro_id", "pro_name", "Com_id" FROM "public"."Product" WHERE "pro_id" = $1';
    const prodParams = [pro_id];
    const productCheck = await pool.query(prodQuery, prodParams);
    if (productCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found.");
    }
    if (role_id !== ROLES.SUPER_ADMIN && productCheck.rows[0].Com_id !== com_id) {
      res.status(403);
      throw new Error("You do not have permission to view recipes for this product.");
    }

    const result = await pool.query(
      `SELECT
        r."recipe_id",
        r."quantity_req",
        r."pro_id",
        r."rawmaterial_ID" AS "rawmaterial_id",
        p."pro_name",
        rm."rm_name",
        COALESCE(r."unit", rm."unit") AS "rm_unit"
      FROM "public"."RECIPE" r
      JOIN "public"."Product"      p  ON p."pro_id" = r."pro_id"
      JOIN "public"."Raw_Material" rm ON rm."rm_id" = r."rawmaterial_ID"
      WHERE r."pro_id" = $1
      ORDER BY r."recipe_id"`,
      [pro_id],
    );

    res.json({
      pro_id: parseInt(pro_id),
      pro_name: productCheck.rows[0].pro_name,
      ingredients: result.rows.map(toResponseRow),
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/recipes
// Single recipe entry
// ─────────────────────────────────────────────
export async function createRecipe(req, res, next) {
  try {
    const { quantity_req, pro_id, rawmaterial_id, unit } = req.body;

    if (unit !== undefined && unit !== null && !VALID_UNITS.includes(unit)) {
      res.status(400);
      throw new Error(`Unit "${unit}" is not valid. Allowed: ${VALID_UNITS.join(", ")}`);
    }

    // ── Presence checks ──────────────────────
    if (quantity_req === undefined || quantity_req === null) {
      res.status(400);
      throw new Error("quantity_req is required.");
    }
    if (pro_id === undefined || pro_id === null) {
      res.status(400);
      throw new Error("pro_id is required.");
    }
    if (rawmaterial_id === undefined || rawmaterial_id === null) {
      res.status(400);
      throw new Error("rawmaterial_id is required.");
    }

    // ── Type / range checks ──────────────────
    if (!isValidQuantity(quantity_req)) {
      res.status(400);
      throw new Error(
        "quantity_req must be a positive number no greater than 99999.999.",
      );
    }
    if (!isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("pro_id must be a positive integer.");
    }
    if (!isPositiveInt(rawmaterial_id)) {
      res.status(400);
      throw new Error("rawmaterial_id must be a positive integer.");
    }

    // ── Business rule: product must exist and belong to the user's company ────
    const productCheck = await pool.query(
      'SELECT "pro_id", "Com_id" FROM "public"."Product" WHERE "pro_id" = $1',
      [pro_id],
    );
    if (productCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found.");
    }
    if (req.user.role_id !== ROLES.SUPER_ADMIN && productCheck.rows[0].Com_id !== req.user.com_id) {
      res.status(403);
      throw new Error("You do not have permission to add a recipe to this product.");
    }

    // ── Business rule: raw material must exist and belong to the user's company ──
    const rmCheck = await pool.query(
      'SELECT "rm_id", "Com_id" FROM "public"."Raw_Material" WHERE "rm_id" = $1',
      [rawmaterial_id],
    );
    if (rmCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Raw material not found.");
    }
    if (req.user.role_id !== ROLES.SUPER_ADMIN && rmCheck.rows[0].Com_id !== req.user.com_id) {
      res.status(403);
      throw new Error("You do not have permission to use this raw material.");
    }

    // ── Business rule: no duplicate pro_id + rawmaterial_id combo ──
    const duplicateCheck = await pool.query(
      `SELECT "recipe_id" FROM "public"."RECIPE"
       WHERE "pro_id" = $1 AND "rawmaterial_ID" = $2`,
      [pro_id, rawmaterial_id],
    );
    if (duplicateCheck.rows.length > 0) {
      res.status(409);
      throw new Error(
        "This raw material is already part of this product's recipe. Use PUT to update the quantity.",
      );
    }

    const safeQty = roundQuantity(quantity_req);

    const result = await pool.query(
      `INSERT INTO "public"."RECIPE" ("quantity_req", "pro_id", "rawmaterial_ID", "unit")
       VALUES ($1, $2, $3, $4)
       RETURNING
         "recipe_id",
         "quantity_req",
         "pro_id",
         "rawmaterial_ID" AS "rawmaterial_id",
         "unit"`,
      [safeQty, pro_id, rawmaterial_id, unit || null],
    );

    res.status(201).json(toResponseRow(result.rows[0]));
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "Invalid foreign key: pro_id or rawmaterial_id does not exist.",
        ),
      );
    }
    if (err?.code === "23505") {
      res.status(409);
      return next(
        new Error(
          "This raw material is already part of this product's recipe.",
        ),
      );
    }
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/recipes/bulk
// Create full recipe for a product in one call
// Body: { pro_id, ingredients: [{ rawmaterial_id, quantity_req }] }
// ─────────────────────────────────────────────
export async function createRecipeBulk(req, res, next) {
  const client = await pool.connect();
  try {
    const { pro_id, ingredients } = req.body;

    // ── Presence checks ──────────────────────
    if (pro_id === undefined || pro_id === null) {
      res.status(400);
      throw new Error("pro_id is required.");
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      res.status(400);
      throw new Error("ingredients must be a non-empty array.");
    }
    if (!isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("pro_id must be a positive integer.");
    }

    // ── Cap ingredient list — realistic kitchen recipe ──
    if (ingredients.length > 50) {
      res.status(400);
      throw new Error("A recipe cannot have more than 50 ingredients.");
    }

    // ── Validate each ingredient ─────────────
    for (let i = 0; i < ingredients.length; i++) {
      const item = ingredients[i];
      const pos = `ingredients[${i}]`;

      if (item.rawmaterial_id === undefined || item.rawmaterial_id === null) {
        res.status(400);
        throw new Error(`${pos}: rawmaterial_id is required.`);
      }
      if (item.quantity_req === undefined || item.quantity_req === null) {
        res.status(400);
        throw new Error(`${pos}: quantity_req is required.`);
      }
      if (!isPositiveInt(item.rawmaterial_id)) {
        res.status(400);
        throw new Error(`${pos}: rawmaterial_id must be a positive integer.`);
      }
      if (!isValidQuantity(item.quantity_req)) {
        res.status(400);
        throw new Error(
          `${pos}: quantity_req must be a positive number no greater than 99999.999.`,
        );
      }
      if (item.unit !== undefined && item.unit !== null && !VALID_UNITS.includes(item.unit)) {
        res.status(400);
        throw new Error(
          `${pos}: Unit "${item.unit}" is not valid. Allowed: ${VALID_UNITS.join(", ")}`,
        );
      }
    }

    // ── Duplicate rawmaterial_id within the submitted list ──
    const rmIds = ingredients.map((i) => i.rawmaterial_id);
    const uniqueRmIds = new Set(rmIds);
    if (uniqueRmIds.size !== rmIds.length) {
      res.status(400);
      throw new Error(
        "ingredients list contains duplicate rawmaterial_id entries.",
      );
    }

    // ── Product must exist and belong to the user's company ───────────────────
    const productCheck = await pool.query(
      'SELECT "pro_id", "pro_name", "Com_id" FROM "public"."Product" WHERE "pro_id" = $1',
      [pro_id],
    );
    if (productCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found.");
    }
    if (req.user.role_id !== ROLES.SUPER_ADMIN && productCheck.rows[0].Com_id !== req.user.com_id) {
      res.status(403);
      throw new Error("You do not have permission to add a recipe to this product.");
    }

    // ── Verify each raw material belongs to user's company ─────────────────────
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      const rmIdsList = ingredients.map((i) => i.rawmaterial_id);
      const rmCheck = await pool.query(
        'SELECT "rm_id" FROM "public"."Raw_Material" WHERE "rm_id" = ANY($1) AND "Com_id" = $2',
        [rmIdsList, req.user.com_id]
      );
      if (rmCheck.rows.length !== rmIdsList.length) {
        res.status(403);
        throw new Error("One or more raw materials do not exist or do not belong to your company.");
      }
    }

    // ── Check no existing recipe entries for this product ──
    const existingCheck = await pool.query(
      'SELECT "recipe_id" FROM "public"."RECIPE" WHERE "pro_id" = $1 LIMIT 1',
      [pro_id],
    );
    if (existingCheck.rows.length > 0) {
      res.status(409);
      throw new Error(
        "This product already has a recipe. Use POST /api/recipes to add individual ingredients or PUT /api/recipes/:id to update.",
      );
    }

    // ── Insert all in a transaction ──────────
    await client.query("BEGIN");

    const inserted = [];
    for (const item of ingredients) {
      const safeQty = roundQuantity(item.quantity_req);
      const result = await client.query(
        `INSERT INTO "public"."RECIPE" ("quantity_req", "pro_id", "rawmaterial_ID", "unit")
         VALUES ($1, $2, $3, $4)
         RETURNING
           "recipe_id",
           "quantity_req",
           "pro_id",
           "rawmaterial_ID" AS "rawmaterial_id",
           "unit"`,
        [safeQty, pro_id, item.rawmaterial_id, item.unit || null],
      );
      inserted.push(toResponseRow(result.rows[0]));
    }

    await client.query("COMMIT");

    res.status(201).json({
      pro_id: parseInt(pro_id),
      pro_name: productCheck.rows[0].pro_name,
      ingredients: inserted,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "Invalid foreign key: one or more rawmaterial_id values do not exist.",
        ),
      );
    }
    if (err?.code === "23505") {
      res.status(409);
      return next(
        new Error(
          "Duplicate entry: one or more raw materials are already in this recipe.",
        ),
      );
    }
    next(err);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// PUT /api/recipes/:id
// ─────────────────────────────────────────────
export async function updateRecipe(req, res, next) {
  try {
    const { id } = req.params;
    const { role_id, com_id } = req.user;

    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid recipe id.");
    }

    const { quantity_req, pro_id, rawmaterial_id, unit } = req.body;

    // ── At least one field required ──────────
    if (
      quantity_req === undefined &&
      pro_id === undefined &&
      rawmaterial_id === undefined &&
      unit === undefined
    ) {
      res.status(400);
      throw new Error(
        "At least one field (quantity_req, pro_id, rawmaterial_id, unit) must be provided.",
      );
    }

    // ── Field-level validation ───────────────
    if (quantity_req !== undefined && !isValidQuantity(quantity_req)) {
      res.status(400);
      throw new Error(
        "quantity_req must be a positive number no greater than 99999.999.",
      );
    }
    if (unit !== undefined && unit !== null && !VALID_UNITS.includes(unit)) {
      res.status(400);
      throw new Error(`Unit "${unit}" is not valid. Allowed: ${VALID_UNITS.join(", ")}`);
    }
    if (pro_id !== undefined && !isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("pro_id must be a positive integer.");
    }
    if (rawmaterial_id !== undefined && !isPositiveInt(rawmaterial_id)) {
      res.status(400);
      throw new Error("rawmaterial_id must be a positive integer.");
    }

    // ── Record must exist and belong to user's company ────────────────────
    let existQuery = `
      SELECT r."recipe_id", r."pro_id", r."rawmaterial_ID" AS "rawmaterial_id"
      FROM "public"."RECIPE" r
      JOIN "public"."Product" p ON p."pro_id" = r."pro_id"
      WHERE r."recipe_id" = $1
    `;
    const existParams = [id];
    if (role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND p."Com_id" = $2`;
      existParams.push(com_id);
    }
    const existing = await pool.query(existQuery, existParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Recipe not found.");
    }

    const current = existing.rows[0];

    // If new pro_id is provided, verify it belongs to user's company
    if (pro_id !== undefined && role_id !== ROLES.SUPER_ADMIN) {
      const productCheck = await pool.query(
        'SELECT "Com_id" FROM "public"."Product" WHERE "pro_id" = $1',
        [pro_id],
      );
      if (productCheck.rows.length === 0 || productCheck.rows[0].Com_id !== com_id) {
        res.status(403);
        throw new Error("You do not have permission to use this product.");
      }
    }

    // If new rawmaterial_id is provided, verify it belongs to user's company
    if (rawmaterial_id !== undefined && role_id !== ROLES.SUPER_ADMIN) {
      const rmCheck = await pool.query(
        'SELECT "Com_id" FROM "public"."Raw_Material" WHERE "rm_id" = $1',
        [rawmaterial_id],
      );
      if (rmCheck.rows.length === 0 || rmCheck.rows[0].Com_id !== com_id) {
        res.status(403);
        throw new Error("You do not have permission to use this raw material.");
      }
    }

    // ── Business rule: no duplicate combo after update ──
    const finalProId = pro_id ?? current.pro_id;
    const finalRawMaterialId = rawmaterial_id ?? current.rawmaterial_id;

    const duplicateCheck = await pool.query(
      `SELECT "recipe_id" FROM "public"."RECIPE"
       WHERE "pro_id" = $1 AND "rawmaterial_ID" = $2 AND "recipe_id" != $3`,
      [finalProId, finalRawMaterialId, id],
    );
    if (duplicateCheck.rows.length > 0) {
      res.status(409);
      throw new Error(
        "This raw material is already part of this product's recipe.",
      );
    }

    const safeQty =
      quantity_req !== undefined ? roundQuantity(quantity_req) : undefined;

    const result = await pool.query(
      `UPDATE "public"."RECIPE"
       SET
         "quantity_req"   = COALESCE($1, "quantity_req"),
         "pro_id"         = COALESCE($2, "pro_id"),
         "rawmaterial_ID" = COALESCE($3, "rawmaterial_ID"),
         "unit"           = COALESCE($4, "unit")
       WHERE "recipe_id" = $5
       RETURNING
         "recipe_id",
         "quantity_req",
         "pro_id",
         "rawmaterial_ID" AS "rawmaterial_id",
         "unit"`,
      [
        fieldOrNull(safeQty),
        fieldOrNull(pro_id),
        fieldOrNull(rawmaterial_id),
        fieldOrNull(unit),
        id,
      ],
    );

    res.json(toResponseRow(result.rows[0]));
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "Invalid foreign key: pro_id or rawmaterial_id does not exist.",
        ),
      );
    }
    if (err?.code === "23505") {
      res.status(409);
      return next(
        new Error(
          "This raw material is already part of this product's recipe.",
        ),
      );
    }
    next(err);
  }
}

// ─────────────────────────────────────────────
// DELETE /api/recipes/:id
// ─────────────────────────────────────────────
export async function deleteRecipe(req, res, next) {
  try {
    const { id } = req.params;
    const { role_id, com_id } = req.user;

    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid recipe id.");
    }

    // Verify recipe exists and belongs to the company
    let checkQuery = `
      SELECT r."recipe_id"
      FROM "public"."RECIPE" r
      JOIN "public"."Product" p ON p."pro_id" = r."pro_id"
      WHERE r."recipe_id" = $1
    `;
    const checkParams = [id];
    if (role_id !== ROLES.SUPER_ADMIN) {
      checkQuery += ` AND p."Com_id" = $2`;
      checkParams.push(com_id);
    }
    const existCheck = await pool.query(checkQuery, checkParams);
    if (existCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Recipe not found.");
    }

    await pool.query(
      'DELETE FROM "public"."RECIPE" WHERE "recipe_id" = $1',
      [id],
    );

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error(
          "Cannot delete: this raw material is still referenced. Remove dependent records first.",
        ),
      );
    }
    next(err);
  }
}

// ─────────────────────────────────────────────
// DELETE /api/recipes/product/:pro_id
// Wipe entire recipe for a product
// ─────────────────────────────────────────────
export async function deleteRecipeByProduct(req, res, next) {
  try {
    const { pro_id } = req.params;
    const { role_id, com_id } = req.user;

    if (!isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("Invalid pro_id.");
    }

    // Verify product exists and belongs to company
    let checkQuery = 'SELECT "pro_id", "Com_id" FROM "public"."Product" WHERE "pro_id" = $1';
    const checkParams = [pro_id];
    const productCheck = await pool.query(checkQuery, checkParams);
    if (productCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found.");
    }
    if (role_id !== ROLES.SUPER_ADMIN && productCheck.rows[0].Com_id !== com_id) {
      res.status(403);
      throw new Error("You do not have permission to delete recipes for this product.");
    }

    const result = await pool.query(
      'DELETE FROM "public"."RECIPE" WHERE "pro_id" = $1 RETURNING "recipe_id"',
      [pro_id],
    );

    res.json({
      message: `Deleted ${result.rows.length} recipe entries for product ${pro_id}.`,
      deleted_count: result.rows.length,
    });
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error(
          "Cannot delete: one or more recipe entries are still referenced.",
        ),
      );
    }
    next(err);
  }
}
