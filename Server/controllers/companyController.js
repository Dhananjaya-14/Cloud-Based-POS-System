import pool from "../config/database.js";

// GET /api/companies
// All companies
export async function getCompanies(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "com_id", "com_name" FROM "Company" ORDER BY "com_id"'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/companies/:id
// one company by id
export async function getCompanyById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT "com_id", "com_name" FROM "Company" WHERE "com_id" = $1',
      [id]
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

// POST /api/companies
// create company
export async function createCompany(req, res, next) {
  try {
    const { com_name } = req.body;

    if (!com_name) {
      res.status(400);
      throw new Error("com_name is required");
    }

    const insertQuery = `
      INSERT INTO "Company" ("com_name")
      VALUES ($1)
      RETURNING "com_id", "com_name"
    `;

    const result = await pool.query(insertQuery, [com_name]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: company already exists"));
    }
    next(err);
  }
}

// PUT /api/companies/:id
// update company
export async function updateCompany(req, res, next) {
  try {
    const { id } = req.params;
    const { com_name } = req.body;

    const existing = await pool.query(
      'SELECT "com_id" FROM "Company" WHERE "com_id" = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    const updateQuery = `
      UPDATE "Company"
      SET "com_name" = COALESCE($1, "com_name")
      WHERE "com_id" = $2
      RETURNING "com_id", "com_name"
    `;

    const result = await pool.query(updateQuery, [com_name ?? null, id]);

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: company already exists"));
    }
    next(err);
  }
}

// DELETE /api/companies/:id
export async function deleteCompany(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "Company" WHERE "com_id" = $1 RETURNING "com_id"',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    res.status(204).send();
  } catch (err) {
    // Handle foreign key constraint (e.g., if branches still reference this company)
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Cannot delete company because it is in use"));
    }
    next(err);
  }
}

