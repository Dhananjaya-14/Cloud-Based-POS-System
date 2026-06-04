import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";

function fieldOrNull(value) {
  // Convert `undefined` -> null (so COALESCE keeps the existing DB value).
  // Preserve 0 for numeric fields.
  return value === undefined ? null : value;
}

function normalizeCatId(body) {
  // API: `cat_id` ; DB: `Cat_id`
  return body?.cat_id ?? body?.Cat_id;
}

function normalizeBranchId(body) {
  // API/DB: `B_id`
  return body?.B_id ?? body?.b_id;
}

function normalizeProPrice(body) {
  // API: `pro_price` ; DB may use a leading-space column name
  return body?.pro_price ?? body?.Pro_Price ?? body?.[" Pro_Price"];
}

function normalizeSpaced(body, apiKey, dbKey) {
  // Support either API keys or DB-shaped payload keys.
  return body?.[apiKey] ?? body?.[dbKey];
}

function toResponseRow(row) {
  // Ensure consistent output keys.
  let stations = row.stations;
  if (typeof stations === "string") {
    try {
      stations = JSON.parse(stations);
    } catch (e) {
      stations = {};
    }
  }

  return {
    Bpro_id: row.Bpro_id,
    pro_name: row.pro_name,
    pro_shortname: row.pro_shortname,
    pro_image: row.pro_image,
    pro_des: row.pro_des,
    pro_quantity: row.pro_quantity,
    pro_price: row.pro_price,
    cat_id: row.cat_id,
    pro_id: row.pro_id,
    B_id: row.B_id,
    cat_name: row.cat_name,
    stations: stations || {},
  };
}

function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function isNonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

// ─────────────────────────────────────────────
// RECIPE INGREDIENT HELPERS
// ─────────────────────────────────────────────

/**
 * Converts a recipe quantity from recipe unit to raw-material stock unit.
 */
function convertQty(recipeQty, recipeUnit, stockUnit) {
  const rUnit = String(recipeUnit || "").toLowerCase().trim();
  const sUnit = String(stockUnit || "").toLowerCase().trim();
  if (rUnit === sUnit || !rUnit || !sUnit) return recipeQty;
  if (rUnit === "g"     && sUnit === "kg")    return recipeQty / 1000;
  if (rUnit === "mg"    && sUnit === "g")     return recipeQty / 1000;
  if (rUnit === "mg"    && sUnit === "kg")    return recipeQty / 1_000_000;
  if (rUnit === "kg"    && sUnit === "g")     return recipeQty * 1000;
  if (rUnit === "ml"    && sUnit === "l")     return recipeQty / 1000;
  if (rUnit === "l"     && sUnit === "ml")    return recipeQty * 1000;
  if (rUnit === "pcs"   && sUnit === "dozen") return recipeQty / 12;
  if (rUnit === "units" && sUnit === "dozen") return recipeQty / 12;
  return recipeQty;
}

/**
 * Deducts or restores raw-material stock according to the product's recipe.
 * Called when a branch admin adds, updates, or removes pre-made product batches.
 *
 * @param {object} client    - pg transaction client (must be inside BEGIN)
 * @param {number} pro_id    - base product ID (used to look up RECIPE)
 * @param {number} b_id      - branch ID (scopes branch-level raw materials)
 * @param {number} quantity  - number of product units being added/removed
 * @param {"subtract"|"add"} operation
 */
async function adjustRecipeIngredients(client, pro_id, b_id, quantity, operation) {
  const recipesResult = await client.query(
    `SELECT
       r."rawmaterial_ID" AS "rawmaterial_id",
       r."quantity_req",
       COALESCE(r."unit", rm."unit") AS "recipe_unit",
       rm."unit"                     AS "stock_unit"
     FROM public."RECIPE"        r
     JOIN public."Raw_Material"  rm ON rm."rm_id" = r."rawmaterial_ID"
     WHERE r."pro_id" = $1
     FOR UPDATE OF rm`,
    [pro_id]
  );

  for (const recipe of recipesResult.rows) {
    const totalQty     = recipe.quantity_req * quantity;
    const convertedQty = convertQty(totalQty, recipe.recipe_unit, recipe.stock_unit);
    const stockExpr    = operation === "subtract"
      ? "GREATEST(0, stock_qty - $1)"
      : "stock_qty + $1";

    await client.query(
      `UPDATE public."Raw_Material"
         SET stock_qty = ${stockExpr}
       WHERE rm_id = $2
         AND (
           b_id = $3
           OR (b_id IS NULL AND $3::integer IS NULL)
         )`,
      [convertedQty, recipe.rawmaterial_id, b_id ?? null]
    );
  }
}

// GET /api/branch_products
export async function getBranchProducts(req, res, next) {
  try {
    const { role_id, com_id } = req.user;
    const branchId = req.query?.b_id ?? req.query?.B_id;
    if (branchId !== undefined && !isPositiveInt(branchId)) {
      res.status(400);
      throw new Error("b_id must be a positive integer");
    }

    let query = `
      SELECT
        bp."Bpro_id",
        bp."pro_name",
        bp." pro_shortname" AS "pro_shortname",
        bp." pro_image" AS "pro_image",
        bp." pro_des" AS "pro_des",
        bp."pro_quantity",
        bp." Pro_Price" AS "pro_price",
        bp."Cat_id" AS "cat_id",
        bp."pro_id",
        bp."B_id",
        c."cat_name",
        p."stations"
      FROM "public"."Branch_Product" bp
      LEFT JOIN "public"."category" c ON bp."Cat_id" = c."cat_id"
      LEFT JOIN "public"."Product"   p ON bp."pro_id" = p."pro_id"
    `;

    const conditions = [];
    const values = [];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ` JOIN "public"."Branch" b ON bp."B_id" = b."B_id"`;
      conditions.push(`b."com_id" = $${conditions.length + 1}`);
      values.push(com_id);
    }

    if (branchId !== undefined) {
      conditions.push(`bp."B_id" = $${conditions.length + 1}`);
      values.push(Number(branchId));
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY bp."Bpro_id"`;

    const result = await pool.query(query, values);

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.json(result.rows.map(toResponseRow));
  } catch (err) {
    next(err);
  }
}

// GET /api/branch_products/:id
export async function getBranchProductById(req, res, next) {
  try {
    const { id } = req.params;
    const { role_id, com_id } = req.user;
    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid branch product id");
    }

    let query = `
      SELECT
        bp."Bpro_id",
        bp."pro_name",
        bp." pro_shortname" AS "pro_shortname",
        bp." pro_image" AS "pro_image",
        bp." pro_des" AS "pro_des",
        bp."pro_quantity",
        bp." Pro_Price" AS "pro_price",
        bp."Cat_id" AS "cat_id",
        bp."pro_id",
        bp."B_id",
        c."cat_name",
        p."stations"
      FROM "public"."Branch_Product" bp
      LEFT JOIN "public"."category" c ON bp."Cat_id" = c."cat_id"
      LEFT JOIN "public"."Product"   p ON bp."pro_id" = p."pro_id"
    `;
    let params = [id];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ` JOIN "public"."Branch" b ON bp."B_id" = b."B_id" WHERE bp."Bpro_id" = $1 AND b."com_id" = $2`;
      params.push(com_id);
    } else {
      query += ` WHERE bp."Bpro_id" = $1`;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Branch product not found");
    }

    res.json(toResponseRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
}

// POST /api/branch_products
export async function createBranchProduct(req, res, next) {
  const client = await pool.connect();
  try {
    const pro_name = req.body?.pro_name;
    const pro_shortname = normalizeSpaced(req.body, "pro_shortname", " pro_shortname");
    const pro_image = normalizeSpaced(req.body, "pro_image", " pro_image");
    const pro_des = normalizeSpaced(req.body, "pro_des", " pro_des");
    const pro_quantity = req.body?.pro_quantity;
    const pro_price = normalizeProPrice(req.body);
    const Cat_id = normalizeCatId(req.body);
    const pro_id = req.body?.pro_id;
    const B_id = req.body?.B_id;

    if (
      !pro_name ||
      pro_shortname === undefined ||
      !pro_image ||
      !pro_des ||
      pro_quantity === undefined ||
      pro_price === undefined ||
      Cat_id === undefined ||
      pro_id === undefined ||
      B_id === undefined
    ) {
      res.status(400);
      throw new Error(
        "pro_name, pro_shortname, pro_image, pro_des, pro_quantity, pro_price, cat_id, pro_id and B_id are required"
      );
    }

    if (typeof pro_name !== "string" || pro_name.trim().length === 0) {
      res.status(400);
      throw new Error("pro_name must be a non-empty string");
    }
    if (typeof pro_shortname !== "string" || pro_shortname.trim().length === 0) {
      res.status(400);
      throw new Error("pro_shortname must be a non-empty string");
    }
    if (typeof pro_image !== "string" || pro_image.trim().length === 0) {
      res.status(400);
      throw new Error("pro_image must be a non-empty string");
    }
    if (typeof pro_des !== "string" || pro_des.trim().length === 0) {
      res.status(400);
      throw new Error("pro_des must be a non-empty string");
    }
    if (!isNonNegativeNumber(pro_quantity)) {
      res.status(400);
      throw new Error("pro_quantity must be a non-negative number");
    }
    if (!isNonNegativeNumber(pro_price)) {
      res.status(400);
      throw new Error("pro_price must be a non-negative number");
    }
    if (!isPositiveInt(Cat_id)) {
      res.status(400);
      throw new Error("cat_id must be a positive integer");
    }
    if (!isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("pro_id must be a positive integer");
    }
    if (!isPositiveInt(B_id)) {
      res.status(400);
      throw new Error("B_id must be a positive integer");
    }

    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      const branchCheck = await client.query('SELECT "com_id" FROM "public"."Branch" WHERE "B_id" = $1', [B_id]);
      if (branchCheck.rows.length === 0 || branchCheck.rows[0].com_id !== req.user.com_id) {
        res.status(403);
        throw new Error("You do not have permission to add products to this branch.");
      }

      const productCheck = await client.query('SELECT "Com_id" FROM "public"."Product" WHERE "pro_id" = $1', [pro_id]);
      if (productCheck.rows.length === 0 || productCheck.rows[0].Com_id !== req.user.com_id) {
        res.status(403);
        throw new Error("You do not have permission to use this base product.");
      }
    }

    await client.query("BEGIN");

    // Lock and check the base product stock
    const productStock = await client.query(
      'SELECT "pro_qty" FROM "public"."Product" WHERE "pro_id" = $1 FOR UPDATE',
      [pro_id]
    );
    if (productStock.rows.length === 0) {
      res.status(404);
      throw new Error("Base product not found");
    }

    const currentBaseQty = Number(productStock.rows[0].pro_qty ?? 0);
    const neededQty = Number(pro_quantity);
    if (neededQty > currentBaseQty) {
      res.status(400);
      throw new Error(`Insufficient stock in main hotel: only ${currentBaseQty} available`);
    }

    // Deduct from main stock
    await client.query(
      'UPDATE "public"."Product" SET "pro_qty" = "pro_qty" - $1 WHERE "pro_id" = $2',
      [neededQty, pro_id]
    );

    const result = await client.query(
      `
      WITH inserted AS (
        INSERT INTO "public"."Branch_Product"
          ("pro_name", " pro_shortname", " pro_image", " pro_des", "pro_quantity", " Pro_Price", "Cat_id", "pro_id", "B_id")
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      )
      SELECT
        i."Bpro_id",
        i."pro_name",
        i." pro_shortname" AS "pro_shortname",
        i." pro_image" AS "pro_image",
        i." pro_des" AS "pro_des",
        i."pro_quantity",
        i." Pro_Price" AS "pro_price",
        i."Cat_id" AS "cat_id",
        i."pro_id",
        i."B_id",
        p."stations"
      FROM inserted i
      LEFT JOIN "public"."Product" p ON i."pro_id" = p."pro_id"
      `,
      [pro_name, pro_shortname, pro_image, pro_des, pro_quantity, pro_price, Cat_id, pro_id, B_id]
    );

    // Deduct raw-material ingredients via recipe mapper (pre-made product prep)
    await adjustRecipeIngredients(client, Number(pro_id), Number(B_id), neededQty, "subtract");

    await client.query("COMMIT");
    res.status(201).json(toResponseRow(result.rows[0]));
  } catch (err) {
    await client.query("ROLLBACK");
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid foreign key: cat_id, pro_id or B_id does not exist")
      );
    }
    next(err);
  } finally {
    client.release();
  }
}

// PUT /api/branch_products/:id
export async function updateBranchProduct(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid branch product id");
    }

    const pro_name = req.body?.pro_name;
    const pro_shortname = normalizeSpaced(req.body, "pro_shortname", " pro_shortname");
    const pro_image = normalizeSpaced(req.body, "pro_image", " pro_image");
    const pro_des = normalizeSpaced(req.body, "pro_des", " pro_des");
    const pro_quantity = req.body?.pro_quantity;
    const pro_price = normalizeProPrice(req.body);
    const Cat_id = normalizeCatId(req.body);
    const pro_id = req.body?.pro_id;
    const B_id = normalizeBranchId(req.body);

    if (pro_name !== undefined && (typeof pro_name !== "string" || pro_name.trim().length === 0)) {
      res.status(400);
      throw new Error("pro_name must be a non-empty string");
    }
    if (
      pro_shortname !== undefined &&
      (typeof pro_shortname !== "string" || pro_shortname.trim().length === 0)
    ) {
      res.status(400);
      throw new Error("pro_shortname must be a non-empty string");
    }
    if (pro_image !== undefined && (typeof pro_image !== "string" || pro_image.trim().length === 0)) {
      res.status(400);
      throw new Error("pro_image must be a non-empty string");
    }
    if (pro_des !== undefined && (typeof pro_des !== "string" || pro_des.trim().length === 0)) {
      res.status(400);
      throw new Error("pro_des must be a non-empty string");
    }
    if (pro_quantity !== undefined && !isNonNegativeNumber(pro_quantity)) {
      res.status(400);
      throw new Error("pro_quantity must be a non-negative number");
    }
    if (pro_price !== undefined && !isNonNegativeNumber(pro_price)) {
      res.status(400);
      throw new Error("pro_price must be a non-negative number");
    }
    if (Cat_id !== undefined && !isPositiveInt(Cat_id)) {
      res.status(400);
      throw new Error("cat_id must be a positive integer");
    }
    if (pro_id !== undefined && !isPositiveInt(pro_id)) {
      res.status(400);
      throw new Error("pro_id must be a positive integer");
    }
    if (B_id !== undefined && !isPositiveInt(B_id)) {
      res.status(400);
      throw new Error("B_id must be a positive integer");
    }

    await client.query("BEGIN");

    let checkQuery = `
      SELECT bp."Bpro_id", bp."pro_quantity", bp."pro_id", bp."B_id"
      FROM "public"."Branch_Product" bp
    `;
    let checkParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      checkQuery += ` JOIN "public"."Branch" b ON bp."B_id" = b."B_id" WHERE bp."Bpro_id" = $1 AND b."com_id" = $2 FOR UPDATE`;
      checkParams.push(req.user.com_id);
    } else {
      checkQuery += ` WHERE bp."Bpro_id" = $1 FOR UPDATE`;
    }
    const existing = await client.query(checkQuery, checkParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Branch product not found");
    }

    const oldBranchQty = Number(existing.rows[0].pro_quantity ?? 0);
    const baseProId    = existing.rows[0].pro_id;
    const branchId     = existing.rows[0].B_id;

    if (pro_quantity !== undefined) {
      const newBranchQty = Number(pro_quantity);
      const diff = newBranchQty - oldBranchQty;

      if (diff !== 0) {
        // Lock and check the base product stock
        const baseProductRes = await client.query(
          'SELECT "pro_qty" FROM "public"."Product" WHERE "pro_id" = $1 FOR UPDATE',
          [baseProId]
        );
        if (baseProductRes.rows.length === 0) {
          res.status(404);
          throw new Error("Base product not found");
        }

        const currentBaseQty = Number(baseProductRes.rows[0].pro_qty ?? 0);

        if (diff > 0) {
          if (diff > currentBaseQty) {
            res.status(400);
            throw new Error(`Insufficient stock in main hotel: only ${currentBaseQty} available`);
          }
          // Deduct from main stock
          await client.query(
            'UPDATE "public"."Product" SET "pro_qty" = "pro_qty" - $1 WHERE "pro_id" = $2',
            [diff, baseProId]
          );
          // Deduct additional raw-material ingredients (more products prepped)
          await adjustRecipeIngredients(client, baseProId, branchId, diff, "subtract");
        } else {
          // Return to main stock
          await client.query(
            'UPDATE "public"."Product" SET "pro_qty" = "pro_qty" + $1 WHERE "pro_id" = $2',
            [Math.abs(diff), baseProId]
          );
          // Restore raw-material ingredients (fewer products → return ingredients)
          await adjustRecipeIngredients(client, baseProId, branchId, Math.abs(diff), "add");
        }
      }
    }

    const result = await client.query(
      `
      WITH updated AS (
        UPDATE "public"."Branch_Product"
        SET
          "pro_name" = COALESCE($1, "pro_name"),
          " pro_shortname" = COALESCE($2, " pro_shortname"),
          " pro_image" = COALESCE($3, " pro_image"),
          " pro_des" = COALESCE($4, " pro_des"),
          "pro_quantity" = COALESCE($5, "pro_quantity"),
          " Pro_Price" = COALESCE($6, " Pro_Price"),
          "Cat_id" = COALESCE($7, "Cat_id"),
          "pro_id" = COALESCE($8, "pro_id"),
          "B_id" = COALESCE($9, "B_id")
        WHERE "Bpro_id" = $10
        RETURNING *
      )
      SELECT
        u."Bpro_id",
        u."pro_name",
        u." pro_shortname" AS "pro_shortname",
        u." pro_image" AS "pro_image",
        u." pro_des" AS "pro_des",
        u."pro_quantity",
        u." Pro_Price" AS "pro_price",
        u."Cat_id" AS "cat_id",
        u."pro_id",
        u."B_id",
        p."stations"
      FROM updated u
      LEFT JOIN "public"."Product" p ON u."pro_id" = p."pro_id"
      `,
      [
        fieldOrNull(pro_name),
        fieldOrNull(pro_shortname),
        fieldOrNull(pro_image),
        fieldOrNull(pro_des),
        fieldOrNull(pro_quantity),
        fieldOrNull(pro_price),
        fieldOrNull(Cat_id),
        fieldOrNull(pro_id),
        fieldOrNull(B_id),
        id,
      ]
    );

    await client.query("COMMIT");
    res.json(toResponseRow(result.rows[0]));
  } catch (err) {
    await client.query("ROLLBACK");
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid foreign key: cat_id, pro_id or B_id does not exist")
      );
    }
    next(err);
  } finally {
    client.release();
  }
}

// DELETE /api/branch_products/:id
export async function deleteBranchProduct(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid branch product id");
    }

    await client.query("BEGIN");

    let checkQuery = `
      SELECT bp."Bpro_id", bp."pro_quantity", bp."pro_id", bp."B_id"
      FROM "public"."Branch_Product" bp
    `;
    let checkParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      checkQuery += ` JOIN "public"."Branch" b ON bp."B_id" = b."B_id" WHERE bp."Bpro_id" = $1 AND b."com_id" = $2 FOR UPDATE`;
      checkParams.push(req.user.com_id);
    } else {
      checkQuery += ` WHERE bp."Bpro_id" = $1 FOR UPDATE`;
    }
    const existing = await client.query(checkQuery, checkParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Branch product not found");
    }

    const remainingQty = Number(existing.rows[0].pro_quantity ?? 0);
    const baseProId    = existing.rows[0].pro_id;
    const branchBId    = existing.rows[0].B_id;

    if (remainingQty > 0) {
      // Return remaining stock to the base product
      await client.query(
        'UPDATE "public"."Product" SET "pro_qty" = "pro_qty" + $1 WHERE "pro_id" = $2',
        [remainingQty, baseProId]
      );
      // Restore raw-material ingredients for remaining unsold units
      await adjustRecipeIngredients(client, baseProId, branchBId, remainingQty, "add");
    }

    const result = await client.query(
      'DELETE FROM "public"."Branch_Product" WHERE "Bpro_id" = $1 RETURNING "Bpro_id"',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Branch product not found");
    }

    await client.query("COMMIT");
    res.status(204).send();
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}