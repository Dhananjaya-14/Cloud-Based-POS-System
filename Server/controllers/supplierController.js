import pool from "../config/database.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), {
      status: 400,
    });
  }
  return parsed;
}

function sanitizeBody(body, allowedFields) {
  const sanitized = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      sanitized[field] =
        typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }
  return sanitized;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateContact(contact) {
  // Allow digits, spaces, +, -, (, ) — typical phone formats
  const contactRegex = /^[0-9+\-\s()]{7,30}$/;
  return contactRegex.test(contact);
}

// ─── GET /api/suppliers ───────────────────────────────────────────────────────
export async function getSuppliers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT sup_id, sup_name, sup_email, sup_contact, sup_address
       FROM "SUPPLIER"
       ORDER BY sup_name ASC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/suppliers/:id ───────────────────────────────────────────────────
export async function getSupplierById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "sup_id");

    const result = await pool.query(
      `SELECT sup_id, sup_name, sup_email, sup_contact, sup_address
       FROM "SUPPLIER"
       WHERE sup_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/suppliers ──────────────────────────────────────────────────────
export async function createSupplier(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "sup_name",
      "sup_email",
      "sup_contact",
      "sup_address",
    ]);

    const { sup_name, sup_email, sup_contact, sup_address } = body;

    // ── Required fields ──
    if (!sup_name || !sup_email || !sup_contact) {
      res.status(400);
      throw new Error("sup_name, sup_email and sup_contact are required");
    }

    // ── Name length ──
    if (sup_name.length < 2) {
      res.status(400);
      throw new Error("sup_name must be at least 2 characters");
    }
    if (sup_name.length > 120) {
      res.status(400);
      throw new Error("sup_name cannot exceed 120 characters");
    }

    // ── Email format ──
    if (!validateEmail(sup_email)) {
      res.status(400);
      throw new Error("sup_email is not a valid email address");
    }
    if (sup_email.length > 150) {
      res.status(400);
      throw new Error("sup_email cannot exceed 150 characters");
    }

    // ── Contact format ──
    if (!validateContact(sup_contact)) {
      res.status(400);
      throw new Error(
        "sup_contact must be a valid phone number (7–30 characters, digits and +, -, spaces allowed)",
      );
    }

    // ── Address length if provided ──
    if (sup_address && sup_address.length > 100) {
      res.status(400);
      throw new Error("sup_address cannot exceed 100 characters");
    }

    // ── Duplicate email check ──
    const dupEmail = await pool.query(
      `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_email) = LOWER($1)`,
      [sup_email],
    );
    if (dupEmail.rows.length > 0) {
      res.status(409);
      throw new Error("A supplier with this email already exists");
    }

    // ── Duplicate name check ──
    const dupName = await pool.query(
      `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_name) = LOWER($1)`,
      [sup_name],
    );
    if (dupName.rows.length > 0) {
      res.status(409);
      throw new Error(`A supplier named "${sup_name}" already exists`);
    }

    const result = await pool.query(
      `INSERT INTO "SUPPLIER" (sup_name, sup_email, sup_contact, sup_address)
       VALUES ($1, $2, $3, $4)
       RETURNING sup_id, sup_name, sup_email, sup_contact, sup_address`,
      [sup_name, sup_email.toLowerCase(), sup_contact, sup_address || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/suppliers/:id ───────────────────────────────────────────────────
export async function updateSupplier(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "sup_id");

    const body = sanitizeBody(req.body, [
      "sup_name",
      "sup_email",
      "sup_contact",
      "sup_address",
    ]);

    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No fields provided to update");
    }

    const { sup_name, sup_email, sup_contact, sup_address } = body;

    // ── Existence check ──
    const existing = await pool.query(
      `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    // ── Name validation ──
    if (sup_name !== undefined) {
      if (sup_name.length < 2) {
        res.status(400);
        throw new Error("sup_name must be at least 2 characters");
      }
      if (sup_name.length > 120) {
        res.status(400);
        throw new Error("sup_name cannot exceed 120 characters");
      }
      const dupName = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_name) = LOWER($1) AND sup_id <> $2`,
        [sup_name, id],
      );
      if (dupName.rows.length > 0) {
        res.status(409);
        throw new Error(`A supplier named "${sup_name}" already exists`);
      }
    }

    // ── Email validation ──
    if (sup_email !== undefined) {
      if (!validateEmail(sup_email)) {
        res.status(400);
        throw new Error("sup_email is not a valid email address");
      }
      if (sup_email.length > 150) {
        res.status(400);
        throw new Error("sup_email cannot exceed 150 characters");
      }
      const dupEmail = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_email) = LOWER($1) AND sup_id <> $2`,
        [sup_email, id],
      );
      if (dupEmail.rows.length > 0) {
        res.status(409);
        throw new Error("A supplier with this email already exists");
      }
    }

    // ── Contact validation ──
    if (sup_contact !== undefined && !validateContact(sup_contact)) {
      res.status(400);
      throw new Error(
        "sup_contact must be a valid phone number (7–30 characters)",
      );
    }

    // ── Address validation ──
    if (sup_address !== undefined && sup_address.length > 100) {
      res.status(400);
      throw new Error("sup_address cannot exceed 100 characters");
    }

    const result = await pool.query(
      `UPDATE "SUPPLIER"
       SET
         sup_name    = COALESCE($1, sup_name),
         sup_email   = COALESCE($2, sup_email),
         sup_contact = COALESCE($3, sup_contact),
         sup_address = COALESCE($4, sup_address)
       WHERE sup_id = $5
       RETURNING sup_id, sup_name, sup_email, sup_contact, sup_address`,
      [
        sup_name    ?? null,
        sup_email   ? sup_email.toLowerCase() : null,
        sup_contact ?? null,
        sup_address ?? null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/suppliers/:id ────────────────────────────────────────────────
export async function deleteSupplier(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "sup_id");

    // ── Cannot delete if supplier has purchase orders ──
    const poCheck = await pool.query(
      `SELECT po_id FROM purchase_order WHERE sup_id = $1 LIMIT 1`,
      [id],
    );
    if (poCheck.rows.length > 0) {
      res.status(409);
      throw new Error(
        "Cannot delete supplier — they have existing purchase orders",
      );
    }

    const result = await pool.query(
      `DELETE FROM "SUPPLIER" WHERE sup_id = $1 RETURNING sup_id`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(new Error("Cannot delete supplier because it is in use"));
    }
    next(err);
  }
}