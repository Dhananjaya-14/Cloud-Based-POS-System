import pool from "../config/database.js";

function fieldOrNull(value) {
  // Convert `undefined` -> null (so COALESCE keeps the existing DB value).
  // Preserve 0 for numeric fields.
  return value === undefined ? null : value;
}

function normalizeCatId(body) {
  // API: `cat_id` ; DB: `Cat_id`
  return body?.cat_id ?? body?.Cat_id;
}

function normalizeProPrice(body) {
  // API: `pro_price` ; DB: ` Pro_Price` (note leading space)
  return body?.pro_price ?? body?.Pro_Price ?? body?.[" Pro_Price"];
}

function normalizeSpaced(body, apiKey, dbKey) {
  // For DB columns with leading spaces like `" pro_image"`.
  return body?.[apiKey] ?? body?.[dbKey];
}

function toResponseRow(row) {
  // Ensure consistent output keys.
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
  };
}

// GET /api/branch_products
export async function getBranchProducts(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT
        "Bpro_id",
        "pro_name",
        " pro_shortname" AS "pro_shortname",
        " pro_image" AS "pro_image",
        " pro_des" AS "pro_des",
        "pro_quantity",
        " Pro_Price" AS "pro_price",
        "Cat_id" AS "cat_id",
        "pro_id"
      FROM "public"."Branch_Product"
      ORDER BY "Bpro_id"
      `
    );

    res.json(result.rows.map(toResponseRow));
  } catch (err) {
    next(err);
  }
}

// GET /api/branch_products/:id
export async function getBranchProductById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        "Bpro_id",
        "pro_name",
        " pro_shortname" AS "pro_shortname",
        " pro_image" AS "pro_image",
        " pro_des" AS "pro_des",
        "pro_quantity",
        " Pro_Price" AS "pro_price",
        "Cat_id" AS "cat_id",
        "pro_id"
      FROM "public"."Branch_Product"
      WHERE "Bpro_id" = $1
      `,
      [id]
    );

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
  try {
    const pro_name = req.body?.pro_name;
    const pro_shortname = normalizeSpaced(req.body, "pro_shortname", " pro_shortname");
    const pro_image = normalizeSpaced(req.body, "pro_image", " pro_image");
    const pro_des = normalizeSpaced(req.body, "pro_des", " pro_des");
    const pro_quantity = req.body?.pro_quantity;
    const pro_price = normalizeProPrice(req.body);
    const Cat_id = normalizeCatId(req.body);
    const pro_id = req.body?.pro_id;

    if (
      !pro_name ||
      pro_shortname === undefined ||
      !pro_image ||
      !pro_des ||
      pro_quantity === undefined ||
      pro_price === undefined ||
      Cat_id === undefined ||
      pro_id === undefined
    ) {
      res.status(400);
      throw new Error(
        "pro_name, pro_shortname, pro_image, pro_des, pro_quantity, pro_price, cat_id and pro_id are required"
      );
    }

    const result = await pool.query(
      `
      INSERT INTO "public"."Branch_Product"
        ("pro_name", " pro_shortname", " pro_image", " pro_des", "pro_quantity", " Pro_Price", "Cat_id", "pro_id")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        "Bpro_id",
        "pro_name",
        " pro_shortname" AS "pro_shortname",
        " pro_image" AS "pro_image",
        " pro_des" AS "pro_des",
        "pro_quantity",
        " Pro_Price" AS "pro_price",
        "Cat_id" AS "cat_id",
        "pro_id"
      `,
      [pro_name, pro_shortname, pro_image, pro_des, pro_quantity, pro_price, Cat_id, pro_id]
    );

    res.status(201).json(toResponseRow(result.rows[0]));
  } catch (err) {
    // Foreign key errors: if Cat_id or pro_id doesn't exist
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid foreign key: cat_id or pro_id does not exist")
      );
    }
    next(err);
  }
}

// PUT /api/branch_products/:id
export async function updateBranchProduct(req, res, next) {
  try {
    const { id } = req.params;

    const pro_name = req.body?.pro_name;
    const pro_shortname = normalizeSpaced(req.body, "pro_shortname", " pro_shortname");
    const pro_image = normalizeSpaced(req.body, "pro_image", " pro_image");
    const pro_des = normalizeSpaced(req.body, "pro_des", " pro_des");
    const pro_quantity = req.body?.pro_quantity;
    const pro_price = normalizeProPrice(req.body);
    const Cat_id = normalizeCatId(req.body);
    const pro_id = req.body?.pro_id;

    const existing = await pool.query(
      'SELECT "Bpro_id" FROM "public"."Branch_Product" WHERE "Bpro_id" = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Branch product not found");
    }

    const result = await pool.query(
      `
      UPDATE "public"."Branch_Product"
      SET
        "pro_name" = COALESCE($1, "pro_name"),
        " pro_shortname" = COALESCE($2, " pro_shortname"),
        " pro_image" = COALESCE($3, " pro_image"),
        " pro_des" = COALESCE($4, " pro_des"),
        "pro_quantity" = COALESCE($5, "pro_quantity"),
        " Pro_Price" = COALESCE($6, " Pro_Price"),
        "Cat_id" = COALESCE($7, "Cat_id"),
        "pro_id" = COALESCE($8, "pro_id")
      WHERE "Bpro_id" = $9
      RETURNING
        "Bpro_id",
        "pro_name",
        " pro_shortname" AS "pro_shortname",
        " pro_image" AS "pro_image",
        " pro_des" AS "pro_des",
        "pro_quantity",
        " Pro_Price" AS "pro_price",
        "Cat_id" AS "cat_id",
        "pro_id"
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
        id,
      ]
    );

    res.json(toResponseRow(result.rows[0]));
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid foreign key: cat_id or pro_id does not exist")
      );
    }
    next(err);
  }
}

// DELETE /api/branch_products/:id
export async function deleteBranchProduct(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "public"."Branch_Product" WHERE "Bpro_id" = $1 RETURNING "Bpro_id"',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Branch product not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

