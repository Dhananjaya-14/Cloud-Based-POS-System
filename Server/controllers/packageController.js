import pool from "../config/database.js";

// GET /api/packages — list all packages
export async function getPackages(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM "Package" ORDER BY package_id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/packages/:id
export async function getPackageById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM "Package" WHERE package_id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Package not found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/packages — create a new package (Super Admin only)
export async function createPackage(req, res, next) {
  try {
    const { package_name, features } = req.body;
    if (!package_name || !features) {
      res.status(400);
      throw new Error("package_name and features are required");
    }
    const result = await pool.query(
      'INSERT INTO "Package" (package_name, features) VALUES ($1, $2) RETURNING *',
      [package_name, JSON.stringify(features)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/packages/:id — update a package (Super Admin only)
export async function updatePackage(req, res, next) {
  try {
    const { id } = req.params;
    const { package_name, features } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (package_name !== undefined) { fields.push(`package_name = $${idx++}`); values.push(package_name); }
    if (features    !== undefined) { fields.push(`features = $${idx++}`);      values.push(JSON.stringify(features)); }

    if (fields.length === 0) {
      res.status(400);
      throw new Error("Nothing to update");
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE "Package" SET ${fields.join(", ")} WHERE package_id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Package not found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
