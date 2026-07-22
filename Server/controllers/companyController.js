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
      'SELECT "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id" FROM "Company" ORDER BY "com_id"',
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
      'SELECT "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone" FROM "Company" WHERE "com_id" = $1',
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
    const { com_name, c_status, c_email, reg_date, location, phone, package_id } = req.body;
    const sanitizedName = sanitizeName(com_name);

    if (!sanitizedName) {
      res.status(400);
      throw new Error("com_name is required and must be 1–255 characters");
    }

    const result = await pool.query(
      `INSERT INTO "Company" ("com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id"`,
      [sanitizedName, c_status ?? true, c_email ?? null, reg_date ?? new Date(), location ?? null, phone ?? null, package_id ?? null],
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
    const { com_name, c_status, c_email, reg_date, location, phone, package_id } = req.body;
    const sanitizedName = com_name ? sanitizeName(com_name) : null;

    if (!sanitizedName && c_status === undefined && !c_email && !reg_date && !location && !phone && package_id === undefined) {
      res.status(400);
      throw new Error("At least one field is required to update");
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
       SET "com_name" = COALESCE($1, "com_name"),
           "c_status" = COALESCE($2, "c_status"),
           "c_email"  = COALESCE($3, "c_email"),
           "reg_date" = COALESCE($4, "reg_date"),
           "location" = COALESCE($5, "location"),
           "phone"    = COALESCE($6, "phone"),
           "package_id" = COALESCE($8, "package_id")
       WHERE "com_id" = $7
       RETURNING "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id"`,
      [sanitizedName ?? null, c_status ?? null, c_email ?? null, reg_date ?? null, location ?? null, phone ?? null, id, package_id ?? null],
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
