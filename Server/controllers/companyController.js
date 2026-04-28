import pool from "../config/database.js";

// Trim and cap name length to match typical DB column constraints
function sanitizeName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 255 ? trimmed : null;
}

export async function getCompanies(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "com_id", "com_name" FROM "Company" ORDER BY "com_id"',
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getCompanyById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT "com_id", "com_name" FROM "Company" WHERE "com_id" = $1',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createCompany(req, res, next) {
  try {
    const com_name = sanitizeName(req.body?.com_name);

    if (!com_name) {
      res.status(400);
      throw new Error("com_name is required and must be 1–255 characters");
    }

    const result = await pool.query(
      `INSERT INTO "Company" ("com_name")
       VALUES ($1)
       RETURNING "com_id", "com_name"`,
      [com_name],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);
      return next(new Error("A company with that name already exists"));
    }
    next(err);
  }
}

export async function updateCompany(req, res, next) {
  try {
    const { id } = req.params;
    const com_name = sanitizeName(req.body?.com_name);

    // Require at least one valid field to update
    if (!com_name) {
      res.status(400);
      throw new Error("com_name is required and must be 1–255 characters");
    }

    const existing = await pool.query(
      'SELECT "com_id" FROM "Company" WHERE "com_id" = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    const result = await pool.query(
      `UPDATE "Company"
       SET "com_name" = $1
       WHERE "com_id" = $2
       RETURNING "com_id", "com_name"`,
      [com_name, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);
      return next(new Error("A company with that name already exists"));
    }
    next(err);
  }
}

export async function deleteCompany(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "Company" WHERE "com_id" = $1 RETURNING "com_id"',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "Cannot delete company: it is referenced by existing records",
        ),
      );
    }
    next(err);
  }
}
