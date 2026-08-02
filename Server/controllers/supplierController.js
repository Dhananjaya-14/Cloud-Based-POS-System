import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import { getIO } from "../utils/socket.js";

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
  const contactRegex = /^[0-9+\-\s()]{7,30}$/;
  return contactRegex.test(contact);
}

function validateSupplierName(sup_name) {
  if (typeof sup_name !== "string") {
    throw Object.assign(new Error("sup_name must be a string"), { status: 400 });
  }
  if (sup_name.length < 2) {
    throw Object.assign(new Error("sup_name must be at least 2 characters"), { status: 400 });
  }
  if (sup_name.length > 120) {
    throw Object.assign(new Error("sup_name cannot exceed 120 characters"), { status: 400 });
  }
  if (!/^[\w\s\-(). &/,]+$/.test(sup_name)) {
    throw Object.assign(new Error("sup_name contains invalid characters"), { status: 400 });
  }
}

// ─── GET /api/suppliers ─────

export async function getSuppliers(req, res, next) {
  try {
    const { role_id, com_id, b_id: userBid } = req.user;
    const filterBid    = req.query.b_id ? Number(req.query.b_id) : null;
    const showInactive = req.query.status === "inactive";

    const activeFilter = (role_id === ROLES.BRANCH_ADMIN || !showInactive)
      ? `AND s.is_active = TRUE`
      : `AND s.is_active = FALSE`;

    let query, params;

    if (role_id === ROLES.SUPER_ADMIN) {
      if (filterBid) {
        query = `SELECT s.sup_id, s.sup_name, s.sup_email, s.sup_contact, s.sup_address, s.is_active, s."Com_id"
                 FROM "SUPPLIER" s
                 JOIN "Branch_Supplier" bs ON bs.sup_id = s.sup_id
                 WHERE bs.b_id = $1 ${showInactive ? "AND s.is_active = FALSE" : "AND s.is_active = TRUE"}
                 ORDER BY s.sup_name ASC`;
        params = [filterBid];
      } else {
        query = `SELECT sup_id, sup_name, sup_email, sup_contact, sup_address, is_active, "Com_id"
                 FROM "SUPPLIER"
                 WHERE ${showInactive ? "is_active = FALSE" : "is_active = TRUE"}
                 ORDER BY sup_name ASC`;
        params = [];
      }
    } else if (role_id === ROLES.BRANCH_ADMIN) {
      // Branch admin: only active suppliers for their branch
      query = `SELECT s.sup_id, s.sup_name, s.sup_email, s.sup_contact, s.sup_address, s.is_active
               FROM "SUPPLIER" s
               JOIN "Branch_Supplier" bs ON bs.sup_id = s.sup_id
               WHERE bs.b_id = $1 AND s."Com_id" = $2 AND s.is_active = TRUE
               ORDER BY s.sup_name ASC`;
      params = [userBid, com_id];
    } else {
      if (filterBid) {
        query = `SELECT s.sup_id, s.sup_name, s.sup_email, s.sup_contact, s.sup_address, s.is_active
                 FROM "SUPPLIER" s
                 JOIN "Branch_Supplier" bs ON bs.sup_id = s.sup_id
                 WHERE bs.b_id = $1 AND s."Com_id" = $2
                   ${showInactive ? "AND s.is_active = FALSE" : "AND s.is_active = TRUE"}
                 ORDER BY s.sup_name ASC`;
        params = [filterBid, com_id];
      } else {
        query = `SELECT sup_id, sup_name, sup_email, sup_contact, sup_address, is_active
                 FROM "SUPPLIER"
                 WHERE "Com_id" = $1
                   AND ${showInactive ? "is_active = FALSE" : "is_active = TRUE"}
                 ORDER BY sup_name ASC`;
        params = [com_id];
      }
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getSupplierById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "sup_id");
    const { role_id, com_id } = req.user;

    let query = `SELECT sup_id, sup_name, sup_email, sup_contact, sup_address
       FROM "SUPPLIER"
       WHERE sup_id = $1`;
    const params = [id];

    if (role_id !== ROLES.SUPER_ADMIN) {
      query += ` AND "Com_id" = $2`;
      params.push(com_id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// Only Company Admin or Super Admin can create suppliers
export async function createSupplier(req, res, next) {
  const client = await pool.connect();
  try {
    if (req.user.role_id === ROLES.BRANCH_ADMIN) {
      res.status(403);
      throw new Error("Branch Admins cannot create suppliers. Contact your Company Admin.");
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400);
      throw new Error("Request body must be a JSON object");
    }

    const body = sanitizeBody(req.body, [
      "sup_name", "sup_email", "sup_contact", "sup_address", "b_id",
    ]);

    const { sup_name, sup_email, sup_contact, sup_address } = body;
    const b_id = body.b_id ? Number(body.b_id) : null;

    if (!sup_name || !sup_email || !sup_contact) {
      res.status(400);
      throw new Error("sup_name, sup_email and sup_contact are required");
    }
    if (!b_id) {
      res.status(400);
      throw new Error("b_id (branch) is required when creating a supplier");
    }

    validateSupplierName(sup_name);

    if (typeof sup_email !== "string" || !validateEmail(sup_email)) {
      res.status(400);
      throw new Error("sup_email is not a valid email address");
    }
    if (sup_email.length > 150) {
      res.status(400);
      throw new Error("sup_email cannot exceed 150 characters");
    }

    if (typeof sup_contact !== "string" || !validateContact(sup_contact)) {
      res.status(400);
      throw new Error("sup_contact must be a valid phone number (7–30 characters)");
    }

    if (sup_address !== undefined) {
      if (typeof sup_address !== "string") {
        res.status(400);
        throw new Error("sup_address must be a string");
      }
      if (sup_address.length > 100) {
        res.status(400);
        throw new Error("sup_address cannot exceed 100 characters");
      }
    }

    let resolvedComId = null;
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      resolvedComId = req.user.com_id;
    } else {
      resolvedComId = req.body.com_id || req.body.Com_id || null;
    }

    if (resolvedComId) {
      const branchCheck = await pool.query(
        `SELECT "B_id" FROM "Branch" WHERE "B_id" = $1 AND "com_id" = $2`,
        [b_id, resolvedComId]
      );
      if (branchCheck.rows.length === 0) {
        res.status(403);
        throw new Error("Branch not found or does not belong to your company");
      }
    }

    // ── Duplicate checks 
    const dupEmailParams = resolvedComId ? [sup_email, resolvedComId] : [sup_email];
    const dupEmailQuery = resolvedComId
      ? `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_email) = LOWER($1) AND "Com_id" = $2`
      : `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_email) = LOWER($1)`;
    const dupEmail = await pool.query(dupEmailQuery, dupEmailParams);
    if (dupEmail.rows.length > 0) {
      res.status(409);
      throw new Error("A supplier with this email already exists");
    }

    const dupNameParams = resolvedComId ? [sup_name, resolvedComId] : [sup_name];
    const dupNameQuery = resolvedComId
      ? `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_name) = LOWER($1) AND "Com_id" = $2`
      : `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_name) = LOWER($1)`;
    const dupName = await pool.query(dupNameQuery, dupNameParams);
    if (dupName.rows.length > 0) {
      res.status(409);
      throw new Error(`A supplier named "${sup_name}" already exists`);
    }

    const dupContactParams = resolvedComId ? [sup_contact, resolvedComId] : [sup_contact];
    const dupContactQuery = resolvedComId
      ? `SELECT sup_id FROM "SUPPLIER" WHERE sup_contact = $1 AND "Com_id" = $2`
      : `SELECT sup_id FROM "SUPPLIER" WHERE sup_contact = $1`;
    const dupContact = await pool.query(dupContactQuery, dupContactParams);
    if (dupContact.rows.length > 0) {
      res.status(409);
      throw new Error("A supplier with this contact number already exists");
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO "SUPPLIER" (sup_name, sup_email, sup_contact, sup_address, "Com_id")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING sup_id, sup_name, sup_email, sup_contact, sup_address`,
      [sup_name, sup_email.toLowerCase(), sup_contact, sup_address || null, resolvedComId],
    );

    const newSupplier = result.rows[0];

    // Link to the specified branch
    await client.query(
      `INSERT INTO "Branch_Supplier" (b_id, sup_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [b_id, newSupplier.sup_id]
    );

    await client.query("COMMIT");

    // Emit socket event for real-time updates with actor info
    try {
      const io = getIO();
      if (io && resolvedComId) {
        const companyRoom = `company_${resolvedComId}`;
        const payload = {
          ...newSupplier,
          b_id,
          actor_id: req.user.u_id || req.user.id,
          actor_name: `${req.user.u_fname || ''} ${req.user.u_lname || ''}`.trim() || req.user.username || 'Unknown User'
        };
        io.to(companyRoom).emit("supplier:created", payload);
        console.log(`Emitted supplier:created to room ${companyRoom}`, newSupplier);
      }
    } catch (socketErr) {
      console.error("Failed to emit socket event for supplier creation:", socketErr);
      // Don't fail the request if socket emission fails
    }

    res.status(201).json({ ...newSupplier, b_id });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// Assign an existing supplier to another branch
export async function assignSupplierToBranch(req, res, next) {
  try {
    if (req.user.role_id === ROLES.BRANCH_ADMIN) {
      res.status(403);
      throw new Error("Branch Admins cannot assign suppliers.");
    }

    const sup_id = parsePositiveInt(req.params.id, "sup_id");
    const b_id = req.body.b_id ? Number(req.body.b_id) : null;

    if (!b_id) {
      res.status(400);
      throw new Error("b_id is required");
    }

    // Verify supplier belongs to company
    const { com_id, role_id } = req.user;
    const supCheck = await pool.query(
      role_id !== ROLES.SUPER_ADMIN
        ? `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1 AND "Com_id" = $2`
        : `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`,
      role_id !== ROLES.SUPER_ADMIN ? [sup_id, com_id] : [sup_id]
    );
    if (supCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    await pool.query(
      `INSERT INTO "Branch_Supplier" (b_id, sup_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [b_id, sup_id]
    );

    res.json({ message: "Supplier assigned to branch successfully" });
  } catch (err) {
    next(err);
  }
}

// Remove a supplier from a specific branch
export async function removeSupplierFromBranch(req, res, next) {
  try {
    if (req.user.role_id === ROLES.BRANCH_ADMIN) {
      res.status(403);
      throw new Error("Branch Admins cannot remove suppliers.");
    }

    const sup_id = parsePositiveInt(req.params.id, "sup_id");
    const b_id = parsePositiveInt(req.params.b_id, "b_id");

    await pool.query(
      `DELETE FROM "Branch_Supplier" WHERE b_id = $1 AND sup_id = $2`,
      [b_id, sup_id]
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// Return all branches a supplier is currently assigned to
export async function getSupplierBranches(req, res, next) {
  try {
    const sup_id = parsePositiveInt(req.params.id, "sup_id");
    const { com_id, role_id } = req.user;

    // Verify supplier belongs to company (unless super admin)
    let supCheck;
    if (role_id !== ROLES.SUPER_ADMIN) {
      supCheck = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1 AND "Com_id" = $2`,
        [sup_id, com_id]
      );
    } else {
      supCheck = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`,
        [sup_id]
      );
    }
    if (supCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    const result = await pool.query(
      `SELECT b."B_id" AS b_id, b."B_name" AS b_name
       FROM "Branch_Supplier" bs
       JOIN "Branch" b ON b."B_id" = bs.b_id
       WHERE bs.sup_id = $1
       ORDER BY b."B_name" ASC`,
      [sup_id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function updateSupplier(req, res, next) {
  try {
    if (req.user.role_id === ROLES.BRANCH_ADMIN) {
      res.status(403);
      throw new Error("Branch Admins cannot edit suppliers.");
    }

    const id = parsePositiveInt(req.params.id, "sup_id");

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400);
      throw new Error("Request body must be a JSON object");
    }

    const body = sanitizeBody(req.body, [
      "sup_name", "sup_email", "sup_contact", "sup_address",
    ]);

    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No fields provided to update");
    }

    const { sup_name, sup_email, sup_contact, sup_address } = body;

    let existQuery = `SELECT sup_id, "Com_id" FROM "SUPPLIER" WHERE sup_id = $1`;
    const existParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND "Com_id" = $2`;
      existParams.push(req.user.com_id);
    }
    const existing = await pool.query(existQuery, existParams);
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    const resolvedComId = existing.rows[0].Com_id;

    if (sup_name !== undefined) {
      validateSupplierName(sup_name);
      const dupName = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_name) = LOWER($1) AND sup_id <> $2 AND "Com_id" = $3`,
        [sup_name, id, resolvedComId]
      );
      if (dupName.rows.length > 0) {
        res.status(409);
        throw new Error(`A supplier named "${sup_name}" already exists`);
      }
    }

    if (sup_email !== undefined) {
      if (!validateEmail(sup_email)) {
        res.status(400);
        throw new Error("sup_email is not a valid email address");
      }
      const dupEmail = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE LOWER(sup_email) = LOWER($1) AND sup_id <> $2 AND "Com_id" = $3`,
        [sup_email, id, resolvedComId]
      );
      if (dupEmail.rows.length > 0) {
        res.status(409);
        throw new Error("A supplier with this email already exists");
      }
    }

    if (sup_contact !== undefined) {
      if (!validateContact(sup_contact)) {
        res.status(400);
        throw new Error("sup_contact must be a valid phone number (7–30 characters)");
      }
      const dupContact = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE sup_contact = $1 AND sup_id <> $2 AND "Com_id" = $3`,
        [sup_contact, id, resolvedComId]
      );
      if (dupContact.rows.length > 0) {
        res.status(409);
        throw new Error("A supplier with this contact number already exists");
      }
    }

    if (sup_address !== undefined && typeof sup_address !== "string") {
      res.status(400);
      throw new Error("sup_address must be a string");
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
        sup_name ?? null,
        sup_email ? sup_email.toLowerCase() : null,
        sup_contact ?? null,
        sup_address ?? null,
        id,
      ],
    );

    const updatedSupplier = result.rows[0];

    // Emit socket event for real-time updates with actor info
    try {
      const io = getIO();
      if (io && resolvedComId) {
        const companyRoom = `company_${resolvedComId}`;
        const payload = {
          ...updatedSupplier,
          actor_id: req.user.u_id || req.user.id,
          actor_name: `${req.user.u_fname || ''} ${req.user.u_lname || ''}`.trim() || req.user.username || 'Unknown User'
        };
        io.to(companyRoom).emit("supplier:updated", payload);
        console.log(`Emitted supplier:updated to room ${companyRoom}`, updatedSupplier);
      }
    } catch (socketErr) {
      console.error("Failed to emit socket event for supplier update:", socketErr);
    }

    res.json(updatedSupplier);
  } catch (err) {
    next(err);
  }
}

export async function deleteSupplier(req, res, next) {
  try {
    if (req.user.role_id === ROLES.BRANCH_ADMIN) {
      res.status(403);
      throw new Error("Branch Admins cannot delete suppliers.");
    }

    const id = parsePositiveInt(req.params.id, "sup_id");

    // ── Existence & Scoping check ──
    let existQuery = `SELECT sup_id, "Com_id", is_active FROM "SUPPLIER" WHERE sup_id = $1`;
    const existParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND "Com_id" = $2`;
      existParams.push(req.user.com_id);
    }
    const existCheck = await pool.query(existQuery, existParams);
    if (existCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }

    const resolvedComId = existCheck.rows[0].Com_id;

    // Check if supplier is already inactive
    if (!existCheck.rows[0].is_active) {
      res.status(409);
      throw new Error("Supplier is already deactivated.");
    }

    // Check if supplier has purchase orders
    const poCheck = await pool.query(
      `SELECT po_id FROM purchase_order WHERE sup_id = $1 LIMIT 1`,
      [id],
    );
    if (poCheck.rows.length > 0) {
      res.status(409);
      throw new Error("Cannot deactivate supplier with existing purchase orders. Archive orders first.");
    }

    // Soft delete - set is_active to FALSE
    await pool.query(
      `UPDATE "SUPPLIER" SET is_active = FALSE WHERE sup_id = $1`,
      [id]
    );

    // Emit socket event for deletion with actor info
    try {
      const io = getIO();
      if (io && resolvedComId) {
        const companyRoom = `company_${resolvedComId}`;
        const payload = {
          sup_id: id,
          actor_id: req.user.u_id || req.user.id,
          actor_name: `${req.user.u_fname || ''} ${req.user.u_lname || ''}`.trim() || req.user.username || 'Unknown User'
        };
        io.to(companyRoom).emit("supplier:deleted", payload);
        console.log(`Emitted supplier:deleted to room ${companyRoom} for supplier ${id}`);
      }
    } catch (socketErr) {
      console.error("Failed to emit socket event for supplier deletion:", socketErr);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function restoreSupplier(req, res, next) {
  try {
    if (req.user.role_id === ROLES.BRANCH_ADMIN) {
      res.status(403);
      throw new Error("Branch Admins cannot restore suppliers.");
    }

    const id = parsePositiveInt(req.params.id, "sup_id");

    let existQuery = `SELECT sup_id, is_active, "Com_id" FROM "SUPPLIER" WHERE sup_id = $1`;
    const existParams = [id];
    if (req.user.role_id !== ROLES.SUPER_ADMIN) {
      existQuery += ` AND "Com_id" = $2`;
      existParams.push(req.user.com_id);
    }
    const existCheck = await pool.query(existQuery, existParams);
    if (existCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier not found");
    }
    if (existCheck.rows[0].is_active) {
      res.status(409);
      throw new Error("Supplier is already active.");
    }

    const resolvedComId = existCheck.rows[0].Com_id;

    const result = await pool.query(
      `UPDATE "SUPPLIER" SET is_active = TRUE WHERE sup_id = $1
       RETURNING sup_id, sup_name, sup_email, sup_contact, sup_address, is_active`,
      [id]
    );

    // Emit socket event for restoration with actor info
    try {
      const io = getIO();
      if (io && resolvedComId) {
        const companyRoom = `company_${resolvedComId}`;
        const payload = {
          ...result.rows[0],
          actor_id: req.user.u_id || req.user.id,
          actor_name: `${req.user.u_fname || ''} ${req.user.u_lname || ''}`.trim() || req.user.username || 'Unknown User'
        };
        io.to(companyRoom).emit("supplier:restored", payload);
        console.log(`Emitted supplier:restored to room ${companyRoom} for supplier ${id}`);
      }
    } catch (socketErr) {
      console.error("Failed to emit socket event for supplier restoration:", socketErr);
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}