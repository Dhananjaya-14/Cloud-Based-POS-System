import pool from "../config/database.js";

// Shared validator
function validateCustomerFields(
  { cust_name, cust_email, cust_phone, cust_address, loyalty_points },
  isCreate = false,
) {
  const errors = [];

  if (isCreate && !cust_name) errors.push("cust_name is required");

  if (cust_name !== undefined) {
    if (typeof cust_name !== "string" || cust_name.trim().length === 0)
      errors.push("cust_name must be a non-empty string");
    else if (cust_name.trim().length > 100)
      errors.push("cust_name must be 100 characters or fewer");
    else if (!/^[a-zA-Z\s'\-\.]+$/.test(cust_name.trim()))
      errors.push("cust_name contains invalid characters");
  }

  if (cust_email !== undefined && cust_email !== null && cust_email !== "") {
    if (typeof cust_email !== "string")
      errors.push("cust_email must be a string");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cust_email.trim()))
      errors.push("cust_email must be a valid email address");
    else if (cust_email.trim().length > 100)
      errors.push("cust_email must be 100 characters or fewer");
  }

  if (cust_phone !== undefined && cust_phone !== null && cust_phone !== "") {
    if (typeof cust_phone !== "string")
      errors.push("cust_phone must be a string");
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(cust_phone.trim()))
      errors.push("cust_phone must be a valid phone number (7–20 digits)");
  }

  if (
    cust_address !== undefined &&
    cust_address !== null &&
    cust_address !== ""
  ) {
    if (typeof cust_address !== "string")
      errors.push("cust_address must be a string");
    else if (cust_address.trim().length > 255)
      errors.push("cust_address must be 255 characters or fewer");
  }

  if (loyalty_points !== undefined && loyalty_points !== null) {
    const parsed = Number(loyalty_points);
    if (!Number.isInteger(parsed))
      errors.push("loyalty_points must be an integer");
    else if (parsed < 0) errors.push("loyalty_points cannot be negative");
    else if (parsed > 9999999)
      errors.push("loyalty_points exceeds maximum allowed value");
  }

  return errors;
}

// GET /api/customers
export async function getCustomers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT "cust_id", "cust_name", "cust_email", "cust_phone", "cust_address", "loyalty_points"
       FROM "CUSTOMER"
       ORDER BY "cust_id"`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
// GET /api/customers/:id
export async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid customer ID"));
    }

    const result = await pool.query(
      `SELECT
         c."cust_id", c."cust_name", c."cust_email",
         c."cust_phone", c."cust_address", c."loyalty_points",
         COALESCE(json_agg(DISTINCT o.*) FILTER (WHERE o."or_id" IS NOT NULL), '[]') AS orders,
         COALESCE(json_agg(DISTINCT r.*) FILTER (WHERE r."reserv_id" IS NOT NULL), '[]') AS reservations
       FROM "CUSTOMER" c
       LEFT JOIN "ORDER" o ON c."cust_id" = o."cust_id"
       LEFT JOIN "RESERVATION" r ON c."cust_id" = r."cust_id"
       WHERE c."cust_id" = $1
       GROUP BY c."cust_id"`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Customer not found"));
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/customers
export async function createCustomer(req, res, next) {
  try {
    const { cust_name, cust_email, cust_phone, cust_address } = req.body;

    const errors = validateCustomerFields(
      { cust_name, cust_email, cust_phone, cust_address },
      true, // isCreate — cust_name required
    );
    if (errors.length > 0) {
      res.status(400);
      return next(new Error(errors.join("; ")));
    }

    // Duplicate email check (only if email provided)
    if (cust_email) {
      const existing = await pool.query(
        'SELECT "cust_id" FROM "CUSTOMER" WHERE LOWER("cust_email") = LOWER($1)',
        [cust_email.trim()],
      );
      if (existing.rows.length > 0) {
        res.status(409);
        return next(new Error("A customer with this email already exists"));
      }
    }

    const result = await pool.query(
      `INSERT INTO "CUSTOMER" ("cust_name", "cust_email", "cust_phone", "cust_address")
       VALUES ($1, $2, $3, $4)
       RETURNING "cust_id", "cust_name", "cust_email", "cust_phone", "cust_address", "loyalty_points"`,
      [
        cust_name.trim(),
        cust_email?.trim().toLowerCase() || null,
        cust_phone?.trim() || null,
        cust_address?.trim() || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      res.status(409);
      return next(new Error("A customer with this email already exists"));
    }
    next(err);
  }
}

// PUT /api/customers/:id
export async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const { cust_name, cust_email, cust_phone, cust_address, loyalty_points } =
      req.body;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid customer ID"));
    }

    // Reject completely empty body
    if (
      cust_name === undefined &&
      cust_email === undefined &&
      cust_phone === undefined &&
      cust_address === undefined &&
      loyalty_points === undefined
    ) {
      res.status(400);
      return next(new Error("No fields provided to update"));
    }

    const errors = validateCustomerFields(
      { cust_name, cust_email, cust_phone, cust_address, loyalty_points },
      false,
    );
    if (errors.length > 0) {
      res.status(400);
      return next(new Error(errors.join("; ")));
    }

    // Confirm customer exists
    const existing = await pool.query(
      'SELECT "cust_id" FROM "CUSTOMER" WHERE "cust_id" = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      return next(new Error("Customer not found"));
    }

    // Email uniqueness check excluding self
    if (cust_email) {
      const emailCheck = await pool.query(
        'SELECT "cust_id" FROM "CUSTOMER" WHERE LOWER("cust_email") = LOWER($1) AND "cust_id" != $2',
        [cust_email.trim(), id],
      );
      if (emailCheck.rows.length > 0) {
        res.status(409);
        return next(new Error("A customer with this email already exists"));
      }
    }

    const result = await pool.query(
      `UPDATE "CUSTOMER"
       SET
         "cust_name"      = COALESCE($1, "cust_name"),
         "cust_email"     = COALESCE($2, "cust_email"),
         "cust_phone"     = COALESCE($3, "cust_phone"),
         "cust_address"   = COALESCE($4, "cust_address"),
         "loyalty_points" = COALESCE($5, "loyalty_points")
       WHERE "cust_id" = $6
       RETURNING "cust_id", "cust_name", "cust_email", "cust_phone", "cust_address", "loyalty_points"`,
      [
        cust_name?.trim() ?? null,
        cust_email?.trim().toLowerCase() ?? null,
        cust_phone?.trim() ?? null,
        cust_address?.trim() ?? null,
        loyalty_points !== undefined ? Number(loyalty_points) : null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      res.status(409);
      return next(new Error("A customer with this email already exists"));
    }
    next(err);
  }
}

// DELETE /api/customers/:id
export async function deleteCustomer(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid customer ID"));
    }

    const result = await pool.query(
      'DELETE FROM "CUSTOMER" WHERE "cust_id" = $1 RETURNING "cust_id"',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Customer not found"));
    }

    res.status(204).send();
  } catch (err) {
    if (err.code === "23503") {
      res.status(409);
      return next(
        new Error(
          "Cannot delete this customer because they have linked orders or reservations",
        ),
      );
    }
    next(err);
  }
}

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
