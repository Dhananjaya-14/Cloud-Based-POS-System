import pool from "../config/database.js";

// GET /api/categories
export async function getCategories(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "cat_id", "cat_name" FROM "public"."category" ORDER BY "cat_id"'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/categories/:id
export async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT "cat_id", "cat_name" FROM "public"."category" WHERE "cat_id" = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Category not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/categories
export async function createCategory(req, res, next) {
  try {
    const { cat_name } = req.body;

    if (!cat_name) {
      res.status(400);
      throw new Error("cat_name is required");
    }

    const result = await pool.query(
      'INSERT INTO "public"."category" ("cat_name") VALUES ($1) RETURNING "cat_id", "cat_name"',
      [cat_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: category already exists"));
    }
    next(err);
  }
}

// PUT /api/categories/:id
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { cat_name } = req.body;

    const existing = await pool.query(
      'SELECT "cat_id" FROM "public"."category" WHERE "cat_id" = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Category not found");
    }

    const result = await pool.query(
      `
      UPDATE "public"."category"
      SET "cat_name" = COALESCE($1, "cat_name")
      WHERE "cat_id" = $2
      RETURNING "cat_id", "cat_name"
      `,
      [cat_name ?? null, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: category already exists"));
    }
    next(err);
  }
}

// DELETE /api/categories/:id
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM "public"."category" WHERE "cat_id" = $1 RETURNING "cat_id"',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Category not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

