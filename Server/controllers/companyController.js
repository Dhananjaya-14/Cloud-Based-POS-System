import pool from "../config/database.js";

// GET /api/companies
export async function getCompanies(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT com_id, com_name FROM "Company" ORDER BY com_id'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/companies/:id
export async function getCompanyById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT com_id, com_name FROM "Company" WHERE com_id = $1',
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
export async function createCompany(req, res, next) {
  try {
    const { com_name } = req.body;

    if (!com_name) {
      res.status(400);
      throw new Error("com_name is required");
    }

    const result = await pool.query(
      'INSERT INTO "Company" (com_name) VALUES ($1) RETURNING com_id, com_name',
      [com_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/companies/:id
export async function updateCompany(req, res, next) {
  try {
    const { id } = req.params;
    const { com_name } = req.body;

    const existing = await pool.query(
      'SELECT com_id FROM "Company" WHERE com_id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    if (!com_name) {
      res.status(400);
      throw new Error("com_name is required");
    }

    const result = await pool.query(
      'UPDATE "Company" SET com_name = $1 WHERE com_id = $2 RETURNING com_id, com_name',
      [com_name, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/companies/:id
export async function deleteCompany(req, res, next) {
  try {
    const { id } = req.params;

    try {
      const result = await pool.query(
        'DELETE FROM "Company" WHERE com_id = $1 RETURNING com_id',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404);
        throw new Error("Company not found");
      }
    } catch (err) {
      // Handle foreign key constraint (e.g., if branches still reference this company)
      if (err.code === "23503") {
        res.status(400);
        return next(new Error("Cannot delete company because it is in use"));
      }
      throw err;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

