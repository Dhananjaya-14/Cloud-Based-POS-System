import pool from "../config/database.js";
import { getIO, SOCKET_EVENTS, emitCompanyEvent } from "../utils/socket.js";

// Trim and cap name length to match typical DB column constraints
function sanitizeName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 255 ? trimmed : null;
}

// ─────────────────────────────────────────────
// Optional service charge / tax settings (set by Super Admin)
//   service_charge_enabled, tax_enabled : boolean
//   service_charge_rate, tax_rate       : percentage 0–100 (max 2 decimals)
// Giving a rate without its *_enabled flag turns the charge on when rate > 0.
// Returns { error } or { fields } containing only the keys that were sent.
// ─────────────────────────────────────────────
const CHARGE_COLUMNS = `"service_charge_enabled", "service_charge_rate", "tax_enabled", "tax_rate"`;

function parseChargeFields(body = {}) {
  const fields = {};

  for (const [flag, rate, label] of [
    ["service_charge_enabled", "service_charge_rate", "Service charge"],
    ["tax_enabled", "tax_rate", "Tax"],
  ]) {
    if (body[flag] !== undefined && body[flag] !== null) {
      const v = body[flag];
      if (typeof v === "boolean") fields[flag] = v;
      else if (v === "true" || v === "false") fields[flag] = v === "true";
      else return { error: `${flag} must be true or false` };
    }

    if (body[rate] !== undefined && body[rate] !== null && body[rate] !== "") {
      const n = Number(body[rate]);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return { error: `${rate} must be a number between 0 and 100` };
      }
      if (Math.round(n * 100) !== n * 100) {
        return { error: `${rate} can have at most 2 decimal places` };
      }
      fields[rate] = n;
      if (fields[flag] === undefined) fields[flag] = n > 0;
    }

    if (fields[flag] === true && fields[rate] === undefined && body.__requireRateWhenEnabled) {
      return { error: `${label} is enabled but ${rate} is missing` };
    }
  }

  return { fields };
}

// numeric columns come back from pg as strings — return numbers
function formatCompany(row) {
  if (!row) return row;
  return {
    ...row,
    ...(row.service_charge_rate != null && { service_charge_rate: Number(row.service_charge_rate) }),
    ...(row.tax_rate != null && { tax_rate: Number(row.tax_rate) }),
  };
}

export async function getCompanies(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "bill_greeting", "bill_logo", "language_code", "service_charge_enabled", "service_charge_rate", "tax_enabled", "tax_rate" FROM "Company" ORDER BY "com_id"',
    );
    res.json(result.rows.map(formatCompany));
  } catch (err) {
    next(err);
  }
}

export async function getCompanyById(req, res, next) {
  try {
    const { id } = req.params;

    if (req.user.role_id !== 6 && parseInt(req.user.com_id) !== parseInt(id)) {
      res.status(403);
      throw new Error("You can only view your own company");
    }

    const result = await pool.query(
      'SELECT "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "bill_greeting", "bill_logo", "language_code", "package_id", "service_charge_enabled", "service_charge_rate", "tax_enabled", "tax_rate" FROM "Company" WHERE "com_id" = $1',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    res.json(formatCompany(result.rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function createCompany(req, res, next) {
  try {
    const { com_name, c_status, c_email, reg_date, location, phone, package_id, language_code } = req.body;
    const sanitizedName = sanitizeName(com_name);

    if (!sanitizedName) {
      res.status(400);
      throw new Error("com_name is required and must be 1–255 characters");
    }

    // Optional — defaults: both disabled, rate 0
    const charges = parseChargeFields({ ...req.body, __requireRateWhenEnabled: true });
    if (charges.error) {
      res.status(400);
      throw new Error(charges.error);
    }
    const c = charges.fields;

    const result = await pool.query(
      `INSERT INTO "Company" ("com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "language_code",
                              ${CHARGE_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "language_code",
                 ${CHARGE_COLUMNS}`,
      [
        sanitizedName, c_status ?? true, c_email ?? null, reg_date ?? new Date(), location ?? null, phone ?? null, package_id ?? null, language_code ?? 'en',
        c.service_charge_enabled ?? false, c.service_charge_rate ?? 0, c.tax_enabled ?? false, c.tax_rate ?? 0,
      ],
    );

    const newCompany = formatCompany(result.rows[0]);
    
    // Emit company created event to all connected super admins
    try {
      const io = getIO();
      if (io) {
        // Emit to all super admin clients
        io.emit(SOCKET_EVENTS.COMPANY_CREATED, newCompany);
        console.log(`Company created event emitted for: ${newCompany.com_name}`);
        
        // Also emit to the company's specific room (if any branch admins are listening)
        emitCompanyEvent(SOCKET_EVENTS.COMPANY_CREATED, newCompany, newCompany.com_id);
      }
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
      // Don't fail the request if socket emission fails
    }

    res.status(201).json(newCompany);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);
      if (err.constraint?.includes("c_email") || err.detail?.includes("c_email")) {
        return next(new Error("A company with that email address already exists"));
      }
      return next(new Error("A company with that name already exists"));
    }
    next(err);
  }
}

export async function updateCompany(req, res, next) {
  try {
    const { id } = req.params;
    const { com_name, c_status, c_email, reg_date, location, phone, package_id, bill_greeting, bill_logo, language_code } = req.body;
    const sanitizedName = com_name ? sanitizeName(com_name) : null;

    const charges = parseChargeFields(req.body);
    if (charges.error) {
      res.status(400);
      throw new Error(charges.error);
    }
    const c = charges.fields;

    if (!sanitizedName && c_status === undefined && !c_email && !reg_date && !location && !phone && package_id === undefined && bill_greeting === undefined && bill_logo === undefined && language_code === undefined && Object.keys(c).length === 0) {
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
           "package_id" = COALESCE($8, "package_id"),
           "bill_greeting" = COALESCE($9, "bill_greeting"),
           "bill_logo" = COALESCE($10, "bill_logo"),
           "language_code" = COALESCE($11, "language_code"),
           "service_charge_enabled" = COALESCE($12, "service_charge_enabled"),
           "service_charge_rate"    = COALESCE($13, "service_charge_rate"),
           "tax_enabled"            = COALESCE($14, "tax_enabled"),
           "tax_rate"               = COALESCE($15, "tax_rate")
       WHERE "com_id" = $7
       RETURNING "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "bill_greeting", "bill_logo", "language_code",
                 ${CHARGE_COLUMNS}`,
      [
        sanitizedName ?? null, c_status ?? null, c_email ?? null, reg_date ?? null, location ?? null, phone ?? null, id, package_id ?? null, bill_greeting ?? null, bill_logo ?? null, language_code ?? null,
        c.service_charge_enabled ?? null, c.service_charge_rate ?? null, c.tax_enabled ?? null, c.tax_rate ?? null,
      ],
    );

    const updatedCompany = formatCompany(result.rows[0]);
    
    // Emit company updated event to all connected super admins
    try {
      const io = getIO();
      if (io) {
        // Emit to all super admin clients
        io.emit(SOCKET_EVENTS.COMPANY_UPDATED, updatedCompany);
        console.log(`Company updated event emitted for: ${updatedCompany.com_name}`);
        
        // Also emit to the company's specific room
        emitCompanyEvent(SOCKET_EVENTS.COMPANY_UPDATED, updatedCompany, updatedCompany.com_id);
      }
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
      // Don't fail the request if socket emission fails
    }

    res.json(updatedCompany);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);
      if (err.constraint?.includes("c_email") || err.detail?.includes("c_email")) {
        return next(new Error("A company with that email address already exists"));
      }
      return next(new Error("A company with that name already exists"));
    }
    next(err);
  }
}

export async function deleteCompany(req, res, next) {
  try {
    const { id } = req.params;

    // Get company info before deletion for socket event
    const companyToDelete = await pool.query(
      'SELECT "com_id", "com_name" FROM "Company" WHERE "com_id" = $1',
      [id],
    );

    if (companyToDelete.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    const result = await pool.query(
      'DELETE FROM "Company" WHERE "com_id" = $1 RETURNING "com_id"',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Company not found");
    }

    // Emit company deleted event to all connected super admins
    try {
      const io = getIO();
      if (io) {
        const deletedData = {
          com_id: parseInt(id),
          com_name: companyToDelete.rows[0].com_name
        };
        
        // Emit to all super admin clients
        io.emit(SOCKET_EVENTS.COMPANY_DELETED, deletedData);
        console.log(`Company deleted event emitted for: ${deletedData.com_name}`);
        
        // Also emit to the company's specific room (if any branch admins are listening)
        emitCompanyEvent(SOCKET_EVENTS.COMPANY_DELETED, deletedData, parseInt(id));
      }
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
      // Don't fail the request if socket emission fails
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

export async function updateCompanySettings(req, res, next) {
  try {
    const { id } = req.params;
    const { com_name, location, phone, bill_greeting, bill_logo } = req.body;
    
    // Ensure the user is updating their own company if they are not super admin
    if (req.user.role_id !== 6 && parseInt(req.user.com_id) !== parseInt(id)) {
      res.status(403);
      throw new Error("You can only update your own company settings");
    }

    const sanitizedName = com_name ? sanitizeName(com_name) : null;

    if (!sanitizedName && location === undefined && phone === undefined && bill_greeting === undefined && bill_logo === undefined) {
      res.status(400);
      throw new Error("At least one setting field is required to update");
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
           "location" = COALESCE($2, "location"),
           "phone" = COALESCE($3, "phone"),
           "bill_greeting" = COALESCE($4, "bill_greeting"),
           "bill_logo" = COALESCE($5, "bill_logo")
       WHERE "com_id" = $6
       RETURNING "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "bill_greeting", "bill_logo"`,
      [sanitizedName ?? null, location ?? null, phone ?? null, bill_greeting ?? null, bill_logo ?? null, id],
    );

    const updatedCompany = result.rows[0];
    
    // Emit company updated event to all connected super admins
    try {
      const io = getIO();
      if (io) {
        io.emit(SOCKET_EVENTS.COMPANY_UPDATED, updatedCompany);
        emitCompanyEvent(SOCKET_EVENTS.COMPANY_UPDATED, updatedCompany, updatedCompany.com_id);
      }
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
    }

    res.json(updatedCompany);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);
      return next(new Error("A company with that name already exists"));
    }
    next(err);
  }
}
