import pool from "../config/database.js";

// GET /api/products
export async function getProducts(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "pro_id", "pro_name", "pro_qty", "pro_price", "pro_image", "Com_id" AS "com_id" FROM "Product" ORDER BY "pro_id"'
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

    const result = await pool.query(
      'SELECT "pro_id", "pro_name", "pro_qty", "pro_price", "pro_image", "Com_id" AS "com_id" FROM "Product" WHERE "pro_id" = $1',
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
    const { pro_name, pro_qty, pro_price, pro_image, com_id } = req.body;

    if (
      !pro_name ||
      pro_qty === undefined ||
      pro_price === undefined ||
      !pro_image ||
      !com_id
    ) {
      res.status(400);
      throw new Error("pro_name, pro_qty, pro_price, pro_image and com_id are required");
    }

    const insertQuery = `
      INSERT INTO "Product" ("pro_name", "pro_qty", "pro_price", "pro_image", "Com_id")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING "pro_id", "pro_name", "pro_qty", "pro_price", "pro_image", "Com_id" AS "com_id"
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
    const { pro_name, pro_qty, pro_price, pro_image, com_id } = req.body;

    const existing = await pool.query('SELECT "pro_id" FROM "Product" WHERE "pro_id" = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Product not found");
    }

    const updateQuery = `
      UPDATE "Product"
      SET
        "pro_name" = COALESCE($1, "pro_name"),
        "pro_qty" = COALESCE($2, "pro_qty"),
        "pro_price" = COALESCE($3, "pro_price"),
        "pro_image" = COALESCE($4, "pro_image"),
        "Com_id" = COALESCE($5, "Com_id")
      WHERE "pro_id" = $6
      RETURNING "pro_id", "pro_name", "pro_qty", "pro_price", "pro_image", "Com_id" AS "com_id"
    `;

    const result = await pool.query(updateQuery, [
      pro_name ?? null,
      pro_qty ?? null,
      pro_price ?? null,
      pro_image ?? null,
      com_id ?? null,
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

    const result = await pool.query(
      'DELETE FROM "Product" WHERE "pro_id" = $1 RETURNING "pro_id"',
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

