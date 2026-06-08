import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import { BRANCH_SOCKET_ROOM, emitSocketEvent } from "../utils/socket.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;

function sanitizeStr(val, max = 255) {
  if (typeof val !== "string") return null;

  const t = val.trim();

  return t.length > 0 && t.length <= max ? t : null;
}

function validateBranchFields({
  B_name,
  B_email,
  B_conNo,
  B_address,
  com_id,
}) {
  const errors = [];

  if (!sanitizeStr(B_name)) {
    errors.push(
      "Branch name is required and must be under 255 characters.",
    );
  }

  if (!B_email || !EMAIL_RE.test(B_email.trim())) {
    errors.push("A valid branch email address is required.");
  }

  if (!B_conNo || !PHONE_RE.test(B_conNo.trim())) {
    errors.push("A valid contact number is required (7–20 digits).");
  }

  if (!sanitizeStr(B_address)) {
    errors.push(
      "Branch address is required and must be under 255 characters.",
    );
  }

  if (!com_id || isNaN(Number(com_id))) {
    errors.push("A valid company (com_id) is required.");
  }

  return errors;
}

const BRANCH_COLS = `"B_id", "B_name", "B_email", "B_conNo", "B_address", "com_id", "B_status"`;

// GET /api/branches
export async function getBranches(req, res, next) {
  try {
    const { role_id, com_id, b_id } = req.user;

    let query = `
      SELECT b.*, c."com_name",
             (SELECT u."u_id"   FROM "User" u WHERE u."B_id" = b."B_id" AND u."role_id" = 1 LIMIT 1) AS "U_id",
             (SELECT u."u_fname" FROM "User" u WHERE u."B_id" = b."B_id" AND u."role_id" = 1 LIMIT 1) AS "u_fname",
             (SELECT u."u_lname" FROM "User" u WHERE u."B_id" = b."B_id" AND u."role_id" = 1 LIMIT 1) AS "u_lname"
      FROM "Branch" b
      LEFT JOIN "Company" c ON b."com_id" = c."com_id"
    `;

    const params = [];

    if (role_id === ROLES.ADMIN && com_id != null) {
      query += ` WHERE b."com_id" = $1`;
      params.push(com_id);
    } else if (role_id === ROLES.BRANCH_ADMIN && b_id != null) {
      query += ` WHERE b."B_id" = $1`;
      params.push(b_id);
    }

    query += ` ORDER BY b."B_id"`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/branches/:id
export async function getBranchById(req, res, next) {
  try {
    const { id } = req.params;
    const { role_id, b_id, com_id } = req.user || {};

    if (isNaN(Number(id))) {
      res.status(400);
      throw new Error("Invalid branch ID.");
    }

    const branchId = Number(id);
    
    // Check permissions for non-admin roles
    if (
      role_id === ROLES.BRANCH_ADMIN ||
      role_id === ROLES.CASHIER ||
      role_id === ROLES.WAITER ||
      role_id === ROLES.KITCHEN_STAFF
    ) {
      if (b_id == null || Number(b_id) !== branchId) {
        return res.status(403).json({
          message: "You can only access your assigned branch.",
        });
      }
    }

    // Build query with optional company filter for admin
    let query = `
      SELECT b.*, c."com_name",
             (SELECT u."u_id"   FROM "User" u WHERE u."B_id" = b."B_id" AND u."role_id" = 1 LIMIT 1) AS "U_id",
             (SELECT u."u_fname" FROM "User" u WHERE u."B_id" = b."B_id" AND u."role_id" = 1 LIMIT 1) AS "u_fname",
             (SELECT u."u_lname" FROM "User" u WHERE u."B_id" = b."B_id" AND u."role_id" = 1 LIMIT 1) AS "u_lname"
      FROM "Branch" b
      LEFT JOIN "Company" c ON b."com_id" = c."com_id"
      WHERE b."B_id" = $1
    `;
    
    const queryParams = [branchId];
    
    // Add company filter for admin users
    if (role_id === ROLES.ADMIN && com_id != null) {
      query += ` AND b."com_id" = $2`;
      queryParams.push(Number(com_id));
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error(
        "Branch not found. It may have been removed or never existed.",
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/branches
export async function createBranch(req, res, next) {
  try {
    const { B_name, B_email, B_conNo, B_address, com_id } = req.body;

    const errors = validateBranchFields({
      B_name,
      B_email,
      B_conNo,
      B_address,
      com_id,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message:
          "Please fix the following issues before creating the branch.",
        errors,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO "Branch"
      ("B_name", "B_email", "B_conNo", "B_address", "com_id")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${BRANCH_COLS}
      `,
      [
        sanitizeStr(B_name),
        B_email.trim().toLowerCase(),
        B_conNo.trim(),
        sanitizeStr(B_address),
        Number(com_id),
      ],
    );

    // Emit realtime event
    try {
      emitSocketEvent("branch:created", result.rows[0], {
        room: BRANCH_SOCKET_ROOM,
      });
    } catch (e) {
      console.error("Failed to emit branch:created", e);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);

      return next(
        new Error(
          "A branch with this email or contact number already exists.",
        ),
      );
    }

    if (err?.code === "23503") {
      res.status(400);

      return next(
        new Error(
          "The selected company no longer exists. Please check and try again.",
        ),
      );
    }

    next(err);
  }
}

// PUT /api/branches/:id
export async function updateBranch(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      throw new Error("Invalid branch ID.");
    }

    const { B_name, B_email, B_conNo, B_address, com_id, status, B_status } = req.body;
    // Accept both 'status' and 'B_status' from the client
    const newStatus = B_status !== undefined ? B_status : status;

    // Must send at least one field
    const hasAnyField = [
      B_name, B_email, B_conNo, B_address, com_id,
    ].some((v) => v !== undefined && v !== null && v !== "") || newStatus !== undefined;

    if (!hasAnyField) {
      return res.status(400).json({
        message: "Please provide at least one field to update.",
      });
    }

    // Validate only provided fields
    const fieldErrors = [];

    if (B_email !== undefined && !EMAIL_RE.test(B_email.trim())) {
      fieldErrors.push("A valid email address is required.");
    }

    if (B_conNo !== undefined && !PHONE_RE.test(B_conNo.trim())) {
      fieldErrors.push(
        "A valid contact number is required (7–20 digits).",
      );
    }

    if (B_name !== undefined && !sanitizeStr(B_name)) {
      fieldErrors.push(
        "Branch name must be between 1 and 255 characters.",
      );
    }

    if (B_address !== undefined && !sanitizeStr(B_address)) {
      fieldErrors.push(
        "Branch address must be between 1 and 255 characters.",
      );
    }

    if (com_id !== undefined && isNaN(Number(com_id))) {
      fieldErrors.push("A valid company (com_id) is required.");
    }

    if (fieldErrors.length > 0) {
      return res.status(400).json({
        message:
          "Please fix the following issues before updating the branch.",
        errors: fieldErrors,
      });
    }

    const existing = await pool.query(
      `
      SELECT "B_id"
      FROM "Branch"
      WHERE "B_id" = $1
      `,
      [id],
    );

    if (existing.rows.length === 0) {
      res.status(404);

      throw new Error(
        "Branch not found. It may have been removed or never existed.",
      );
    }

    const result = await pool.query(
      `
      UPDATE "Branch"
      SET
        "B_name"    = COALESCE($1, "B_name"),
        "B_email"   = COALESCE($2, "B_email"),
        "B_conNo"   = COALESCE($3, "B_conNo"),
        "B_address" = COALESCE($4, "B_address"),
        "com_id"    = COALESCE($5, "com_id"),
        "B_status"  = CASE WHEN $7::boolean IS NOT NULL THEN $7::boolean ELSE "B_status" END
      WHERE "B_id" = $6
      RETURNING ${BRANCH_COLS}
      `,
      [
        B_name ? sanitizeStr(B_name) : null,
        B_email ? B_email.trim().toLowerCase() : null,
        B_conNo ? B_conNo.trim() : null,
        B_address ? sanitizeStr(B_address) : null,
        com_id ? Number(com_id) : null,
        id,
        newStatus !== undefined ? Boolean(newStatus) : null,
      ],
    );

    // Emit realtime update event
    try {
      emitSocketEvent("branch:updated", result.rows[0], {
        room: BRANCH_SOCKET_ROOM,
      });
    } catch (e) {
      console.error("Failed to emit branch:updated", e);
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);

      return next(
        new Error(
          "A branch with this email or contact number already exists.",
        ),
      );
    }

    if (err?.code === "23503") {
      res.status(400);

      return next(
        new Error(
          "The selected company no longer exists. Please check and try again.",
        ),
      );
    }

    next(err);
  }
}

// DELETE /api/branches/:id
export async function deleteBranch(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      throw new Error("Invalid branch ID.");
    }

    const result = await pool.query(
      `
      DELETE FROM "Branch"
      WHERE "B_id" = $1
      RETURNING "B_id"
      `,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);

      throw new Error(
        "Branch not found. It may have been removed or never existed.",
      );
    }

    // Emit realtime delete event
    try {
      emitSocketEvent(
        "branch:deleted",
        { B_id: Number(id) },
        {
          room: BRANCH_SOCKET_ROOM,
        },
      );
    } catch (e) {
      console.error("Failed to emit branch:deleted", e);
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);

      return next(
        new Error(
          "This branch cannot be deleted because it still has active records linked to it.",
        ),
      );
    }

    next(err);
  }
}