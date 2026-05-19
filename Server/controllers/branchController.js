import pool from "../config/database.js";
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
  U_id,
}) {
  const errors = [];

  if (!sanitizeStr(B_name))
    errors.push("Branch name is required and must be under 255 characters.");
  if (!B_email || !EMAIL_RE.test(B_email.trim()))
    errors.push("A valid branch email address is required.");
  if (!B_conNo || !PHONE_RE.test(B_conNo.trim()))
    errors.push("A valid contact number is required (7–20 digits).");
  if (!sanitizeStr(B_address))
    errors.push("Branch address is required and must be under 255 characters.");
  if (!com_id || isNaN(Number(com_id)))
    errors.push("A valid company (com_id) is required.");
  if (!U_id || isNaN(Number(U_id)))
    errors.push("A valid user (U_id) is required.");

  return errors;
}

const BRANCH_COLS = `"B_id", "B_name", "B_email", "B_conNo", "B_address", "com_id", "U_id"`;

// GET /api/branches
export async function getBranches(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT ${BRANCH_COLS} FROM "Branch" ORDER BY "B_id"`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/branches/:id
export async function getBranchById(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      throw new Error("Invalid branch ID.");
    }

    const result = await pool.query(
      `SELECT ${BRANCH_COLS} FROM "Branch" WHERE "B_id" = $1`,
      [id],
    );

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
    const { B_name, B_email, B_conNo, B_address, com_id, U_id } = req.body;

    const errors = validateBranchFields({
      B_name,
      B_email,
      B_conNo,
      B_address,
      com_id,
      U_id,
    });
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Please fix the following issues before creating the branch.",
        errors,
      });
    }

    const result = await pool.query(
      `INSERT INTO "Branch" ("B_name", "B_email", "B_conNo", "B_address", "com_id", "U_id")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${BRANCH_COLS}`,
      [
        sanitizeStr(B_name),
        B_email.trim().toLowerCase(),
        B_conNo.trim(),
        sanitizeStr(B_address),
        Number(com_id),
        Number(U_id),
      ],
    );

    // Emit realtime event for other admin clients
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
        new Error("A branch with this email or contact number already exists."),
      );
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "The selected company or user no longer exists. Please check and try again.",
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

    const { B_name, B_email, B_conNo, B_address, com_id, U_id } = req.body;

    // Must send at least one field
    const hasAnyField = [
      B_name,
      B_email,
      B_conNo,
      B_address,
      com_id,
      U_id,
    ].some((v) => v !== undefined && v !== null && v !== "");
    if (!hasAnyField) {
      return res.status(400).json({
        message: "Please provide at least one field to update.",
      });
    }

    // Validate only the fields that were provided
    const fieldErrors = [];
    if (B_email !== undefined && !EMAIL_RE.test(B_email.trim()))
      fieldErrors.push("A valid email address is required.");
    if (B_conNo !== undefined && !PHONE_RE.test(B_conNo.trim()))
      fieldErrors.push("A valid contact number is required (7–20 digits).");
    if (B_name !== undefined && !sanitizeStr(B_name))
      fieldErrors.push("Branch name must be between 1 and 255 characters.");
    if (B_address !== undefined && !sanitizeStr(B_address))
      fieldErrors.push("Branch address must be between 1 and 255 characters.");
    if (com_id !== undefined && isNaN(Number(com_id)))
      fieldErrors.push("A valid company (com_id) is required.");
    if (U_id !== undefined && isNaN(Number(U_id)))
      fieldErrors.push("A valid user (U_id) is required.");

    if (fieldErrors.length > 0) {
      return res.status(400).json({
        message: "Please fix the following issues before updating the branch.",
        errors: fieldErrors,
      });
    }

    const existing = await pool.query(
      'SELECT "B_id" FROM "Branch" WHERE "B_id" = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error(
        "Branch not found. It may have been removed or never existed.",
      );
    }

    const result = await pool.query(
      `UPDATE "Branch"
       SET
         "B_name"    = COALESCE($1, "B_name"),
         "B_email"   = COALESCE($2, "B_email"),
         "B_conNo"   = COALESCE($3, "B_conNo"),
         "B_address" = COALESCE($4, "B_address"),
         "com_id"    = COALESCE($5, "com_id"),
         "U_id"      = COALESCE($6, "U_id")
       WHERE "B_id" = $7
       RETURNING ${BRANCH_COLS}`,
      [
        B_name ? sanitizeStr(B_name) : null,
        B_email ? B_email.trim().toLowerCase() : null,
        B_conNo ? B_conNo.trim() : null,
        B_address ? sanitizeStr(B_address) : null,
        com_id ? Number(com_id) : null,
        U_id ? Number(U_id) : null,
        id,
      ],
    );

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
        new Error("A branch with this email or contact number already exists."),
      );
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "The selected company or user no longer exists. Please check and try again.",
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
      'DELETE FROM "Branch" WHERE "B_id" = $1 RETURNING "B_id"',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error(
        "Branch not found. It may have been removed or never existed.",
      );
    }

    // Emit deletion event
    try {
      emitSocketEvent("branch:deleted", { B_id: Number(id) }, {
        room: BRANCH_SOCKET_ROOM,
      });
    } catch (e) {
      console.error("Failed to emit branch:deleted", e);
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "This branch cannot be deleted because it still has active records linked to it (e.g. staff or sales). Please reassign or remove them first.",
        ),
      );
    }
    next(err);
  }
}
