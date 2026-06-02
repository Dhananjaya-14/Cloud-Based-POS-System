import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";

function normalizeComId(body) {
  // Support both `com_id` (API-friendly) and `Com_id` (exact DB column).
  return body?.com_id ?? body?.Com_id;
}

function fieldOrNull(value) {
  // Convert `undefined` -> null (so COALESCE keeps the existing DB value),
  // but preserve valid falsy values like 0.
  return value === undefined ? null : value;
}

function isPositiveInt(value) {
  // Check if value is a valid positive integer.
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function isNonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

// GET /api/products
export async function getProducts(req, res, next) {
  try {
    const { role_id, com_id } = req.user;
    
    let result;
    if (role_id === ROLES.SUPER_ADMIN) {
      result = await pool.query(
        'SELECT p."pro_id", p."pro_name", p."pro_qty", p."pro_price", p." pro_image" AS "pro_image", p."Com_id" AS "com_id", p."cat_id", c."cat_name" FROM "public"."Product" p LEFT JOIN "public"."category" c ON p."cat_id" = c."cat_id" ORDER BY p."pro_id"'
      );
    } else {
      result = await pool.query(
        'SELECT p."pro_id", p."pro_name", p."pro_qty", p."pro_price", p." pro_image" AS "pro_image", p."Com_id" AS "com_id", p."cat_id", c."cat_name" FROM "public"."Product" p LEFT JOIN "public"."category" c ON p."cat_id" = c."cat_id" WHERE p."Com_id" = $1 ORDER BY p."pro_id"',
        [com_id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const { role_id, com_id } = req.user;
    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid product id");
    }

    let query = 'SELECT p."pro_id", p."pro_name", p."pro_qty", p."pro_price", p." pro_image" AS "pro_image", p."Com_id" AS "com_id", p."cat_id", c."cat_name" FROM "public"."Product" p LEFT JOIN "public"."category" c ON p."cat_id" = c."cat_id" WHERE p."pro_id" = $1';
    let params = [id];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ' AND p."Com_id" = $2';
      params.push(com_id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/products
//create product
export async function createProduct(req, res, next) {
  try {
    const { pro_name, pro_qty, pro_price, pro_image, cat_id } = req.body;
    const com_id = normalizeComId(req.body);

    if (
      !pro_name ||
      pro_qty === undefined ||
      pro_price === undefined ||
      !pro_image ||
      com_id === undefined
    ) {
      res.status(400);
      throw new Error("pro_name, pro_qty, pro_price, pro_image and com_id are required");
    }

    if (typeof pro_name !== "string" || pro_name.trim().length === 0) {
      res.status(400);
      throw new Error("pro_name must be a non-empty string");
    }

    if (typeof pro_image !== "string" || pro_image.trim().length === 0) {
      res.status(400);
      throw new Error("pro_image must be a non-empty string");
    }

    if (!isNonNegativeNumber(pro_qty)) {
      res.status(400);
      throw new Error("pro_qty must be a non-negative number");
    }

    if (!isNonNegativeNumber(pro_price)) {
      res.status(400);
      throw new Error("pro_price must be a non-negative number");
    }

    if (!isPositiveInt(com_id)) {
      res.status(400);
      throw new Error("com_id must be a positive integer");
    }

    // cat_id is optional — only insert if provided
    const resolvedCatId = cat_id != null && isPositiveInt(cat_id) ? Number(cat_id) : null;

    const insertQuery = resolvedCatId
      ? `INSERT INTO "public"."Product" ("pro_name", "pro_qty", "pro_price", " pro_image", "Com_id", "cat_id")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING "pro_id", "pro_name", "pro_qty", "pro_price", " pro_image" AS "pro_image", "Com_id" AS "com_id", "cat_id"`
      : `INSERT INTO "public"."Product" ("pro_name", "pro_qty", "pro_price", " pro_image", "Com_id")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING "pro_id", "pro_name", "pro_qty", "pro_price", " pro_image" AS "pro_image", "Com_id" AS "com_id"`;

    const insertParams = resolvedCatId
      ? [pro_name, pro_qty, pro_price, pro_image, com_id, resolvedCatId]
      : [pro_name, pro_qty, pro_price, pro_image, com_id];

    const result = await pool.query(insertQuery, insertParams);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: product already exists"));
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: com_id does not exist"));
    }
    next(err);
  }
}

// PUT /api/products/:id
//update product
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { pro_name, pro_qty, pro_price, pro_image, cat_id } = req.body;
    const com_id = normalizeComId(req.body);
    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid product id");
    }

    if (pro_name !== undefined && (typeof pro_name !== "string" || pro_name.trim().length === 0)) {
      res.status(400);
      throw new Error("pro_name must be a non-empty string");
    }

    if (pro_image !== undefined && (typeof pro_image !== "string" || pro_image.trim().length === 0)) {
      res.status(400);
      throw new Error("pro_image must be a non-empty string");
    }

    if (pro_qty !== undefined && !isNonNegativeNumber(pro_qty)) {
      res.status(400);
      throw new Error("pro_qty must be a non-negative number");
    }

    if (pro_price !== undefined && !isNonNegativeNumber(pro_price)) {
      res.status(400);
      throw new Error("pro_price must be a non-negative number");
    }

    if (com_id !== undefined && !isPositiveInt(com_id)) {
      res.status(400);
      throw new Error("com_id must be a positive integer");
    }

    if (cat_id !== undefined && cat_id !== null && !isPositiveInt(cat_id)) {
      res.status(400);
      throw new Error("cat_id must be a positive integer");
    }

    const { role_id, com_id: userComId } = req.user;
    if (role_id !== ROLES.SUPER_ADMIN && com_id !== undefined && com_id !== userComId) {
      res.status(403);
      throw new Error("You do not have permission to assign this product to another company.");
    }

    let checkQuery = 'SELECT "pro_id" FROM "public"."Product" WHERE "pro_id" = $1';
    let checkParams = [id];
    if (role_id !== ROLES.SUPER_ADMIN) {
      checkQuery += ' AND "Com_id" = $2';
      checkParams.push(userComId);
    }
    const existing = await pool.query(checkQuery, checkParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found");
    }

    const resolvedCatId = cat_id !== undefined ? (cat_id != null && isPositiveInt(cat_id) ? Number(cat_id) : null) : undefined;

    const updateQuery = `
      UPDATE "public"."Product"
      SET
        "pro_name" = COALESCE($1, "pro_name"),
        "pro_qty" = COALESCE($2, "pro_qty"),
        "pro_price" = COALESCE($3, "pro_price"),
        " pro_image" = COALESCE($4, " pro_image"),
        "Com_id" = COALESCE($5, "Com_id"),
        "cat_id" = COALESCE($6, "cat_id")
      WHERE "pro_id" = $7
      RETURNING "pro_id", "pro_name", "pro_qty", "pro_price", " pro_image" AS "pro_image", "Com_id" AS "com_id", "cat_id"
    `;

    const result = await pool.query(updateQuery, [
      fieldOrNull(pro_name),
      fieldOrNull(pro_qty),
      fieldOrNull(pro_price),
      fieldOrNull(pro_image),
      fieldOrNull(com_id),
      fieldOrNull(resolvedCatId),
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: com_id does not exist"));
    }
    next(err);
  }
}

// DELETE /api/products/:id
//delete product
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid product id");
    }

    const { role_id, com_id } = req.user;
    let deleteQuery = 'DELETE FROM "public"."Product" WHERE "pro_id" = $1';
    let deleteParams = [id];
    if (role_id !== ROLES.SUPER_ADMIN) {
      deleteQuery += ' AND "Com_id" = $2';
      deleteParams.push(com_id);
    }
    deleteQuery += ' RETURNING "pro_id"';
    const result = await pool.query(deleteQuery, deleteParams);

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

