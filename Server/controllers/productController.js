import pool from "../config/database.js";

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
    const result = await pool.query(
      'SELECT "pro_id", "pro_name", "pro_qty", "pro_price", " pro_image" AS "pro_image", "Com_id" AS "com_id" FROM "public"."Product" ORDER BY "pro_id"'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      res.status(400);
      throw new Error("Invalid product id");
    }

    const result = await pool.query(
      'SELECT "pro_id", "pro_name", "pro_qty", "pro_price", " pro_image" AS "pro_image", "Com_id" AS "com_id" FROM "public"."Product" WHERE "pro_id" = $1',
      [id]
    );

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
    const { pro_name, pro_qty, pro_price, pro_image } = req.body;
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

    const insertQuery = `
      INSERT INTO "public"."Product" ("pro_name", "pro_qty", "pro_price", " pro_image", "Com_id")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING "pro_id", "pro_name", "pro_qty", "pro_price", " pro_image" AS "pro_image", "Com_id" AS "com_id"
    `;

    const result = await pool.query(insertQuery, [
      pro_name,
      pro_qty,
      pro_price,
      pro_image,
      com_id,
    ]);

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
    const { pro_name, pro_qty, pro_price, pro_image } = req.body;
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

    const existing = await pool.query('SELECT "pro_id" FROM "public"."Product" WHERE "pro_id" = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found");
    }

    const updateQuery = `
      UPDATE "public"."Product"
      SET
        "pro_name" = COALESCE($1, "pro_name"),
        "pro_qty" = COALESCE($2, "pro_qty"),
        "pro_price" = COALESCE($3, "pro_price"),
        " pro_image" = COALESCE($4, " pro_image"),
        "Com_id" = COALESCE($5, "Com_id")
      WHERE "pro_id" = $6
      RETURNING "pro_id", "pro_name", "pro_qty", "pro_price", " pro_image" AS "pro_image", "Com_id" AS "com_id"
    `;

    const result = await pool.query(updateQuery, [
      fieldOrNull(pro_name),
      fieldOrNull(pro_qty),
      fieldOrNull(pro_price),
      fieldOrNull(pro_image),
      fieldOrNull(com_id),
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

    const result = await pool.query(
      'DELETE FROM "public"."Product" WHERE "pro_id" = $1 RETURNING "pro_id"',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

