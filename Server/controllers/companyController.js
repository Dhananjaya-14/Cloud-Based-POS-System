import pool from "../config/database.js";
import { getIO, SOCKET_EVENTS, emitCompanyEvent } from "../utils/socket.js";

// Trim and cap name length to match typical DB column constraints
function sanitizeName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 255 ? trimmed : null;
}

export async function getCompanies(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "bill_greeting", "bill_logo", "language_code" FROM "Company" ORDER BY "com_id"',
    );
    res.json(result.rows);
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
      'SELECT "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "bill_greeting", "bill_logo", "language_code", "package_id" FROM "Company" WHERE "com_id" = $1',
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
    const { com_name, c_status, c_email, reg_date, location, phone, package_id, language_code } = req.body;
    const sanitizedName = sanitizeName(com_name);

    if (!sanitizedName) {
      res.status(400);
      throw new Error("com_name is required and must be 1â€“255 characters");
    }

    const result = await pool.query(
      `INSERT INTO "Company" ("com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "language_code")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "language_code"`,
      [sanitizedName, c_status ?? true, c_email ?? null, reg_date ?? new Date(), location ?? null, phone ?? null, package_id ?? null, language_code ?? 'en'],
    );

    const newCompany = result.rows[0];
    
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

    if (!sanitizedName && c_status === undefined && !c_email && !reg_date && !location && !phone && package_id === undefined && bill_greeting === undefined && bill_logo === undefined) {
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
           "language_code" = COALESCE($11, "language_code")
       WHERE "com_id" = $7
       RETURNING "com_id", "com_name", "c_status", "c_email", "reg_date", "location", "phone", "package_id", "bill_greeting", "bill_logo", "language_code"`,
      [sanitizedName ?? null, c_status ?? null, c_email ?? null, reg_date ?? null, location ?? null, phone ?? null, id, package_id ?? null, bill_greeting ?? null, bill_logo ?? null, language_code ?? null],
    );

    const updatedCompany = result.rows[0];
    
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
