import pool from "../config/database.js";

/**
 * ✅ Create Waste Record & Reduce Stock
 */
export const createWaste = async (req, res) => {
  const client = await pool.connect();
  try {
    const { rm_id, waste_qty, reason } = req.body;

    // 1. Validation
    if (!rm_id || !waste_qty) {
      return res.status(400).json({ error: "rm_id and waste_qty are required" });
    }

    if (waste_qty <= 0) {
      return res.status(400).json({ error: "waste_qty must be greater than 0" });
    }

    // Start Transaction
    await client.query("BEGIN");

    // 2. Check if Raw Material exists and has enough stock
    const rmCheck = await client.query(
      'SELECT rm_id, rm_name, stock_qty FROM "Raw_Material" WHERE rm_id = $1',
      [rm_id]
    );

    if (rmCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Raw material not found" });
    }

    const currentStock = parseFloat(rmCheck.rows[0].stock_qty);
    if (waste_qty > currentStock) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient stock. Current stock is ${currentStock}`,
      });
    }

    // 3. Insert into "Waste"
    const wasteResult = await client.query(
      `INSERT INTO "Waste" (rm_id, waste_qty, reason, recorded_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [rm_id, waste_qty, reason]
    );

    // 4. Reduce stock in "Raw_Material"
    await client.query(
      'UPDATE "Raw_Material" SET stock_qty = stock_qty - $1 WHERE rm_id = $2',
      [waste_qty, rm_id]
    );

    // Commit Transaction
    await client.query("COMMIT");

    // Calculate percentage for this specific action
    const percentage = ((waste_qty / currentStock) * 100).toFixed(2);

    res.status(201).json({
      message: "Waste record created and stock reduced successfully",
      data: {
        ...wasteResult.rows[0],
        waste_percentage: `${percentage}%`,
      },
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("CREATE WASTE ERROR:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  } finally {
    if (client) client.release();
  }
};

/**
 * ✅ Get All Waste Records
 */
export const getAllWaste = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        w.waste_id,
        w.rm_id,
        rm.rm_name,
        w.waste_qty,
        w.reason,
        w.recorded_at
      FROM "Waste" w
      JOIN "Raw_Material" rm ON w.rm_id = rm.rm_id
      ORDER BY w.recorded_at DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("GET ALL WASTE ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * ✅ Get Waste By ID
 */
export const getWasteById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
         w.*, 
         rm.rm_name
       FROM "Waste" w
       JOIN "Raw_Material" rm ON w.rm_id = rm.rm_id
       WHERE w.waste_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Waste record not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("GET WASTE BY ID ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * ✅ Update Waste Record
 * Note: Updating waste quantity requires adjusting "Raw_Material" stock accordingly
 */
export const updateWaste = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { waste_qty, reason } = req.body;

    if (waste_qty === undefined || waste_qty <= 0) {
      return res.status(400).json({ error: "Valid waste_qty is required" });
    }

    await client.query("BEGIN");

    // 1. Get old waste record to calculate stock difference
    const oldWaste = await client.query('SELECT rm_id, waste_qty FROM "Waste" WHERE waste_id = $1', [id]);
    if (oldWaste.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Waste record not found" });
    }

    const { rm_id, waste_qty: oldQty } = oldWaste.rows[0];
    const diff = waste_qty - oldQty;

    // 2. Check if stock adjustment is possible
    if (diff > 0) {
      const rmCheck = await client.query('SELECT stock_qty FROM "Raw_Material" WHERE rm_id = $1', [rm_id]);
      if (parseFloat(rmCheck.rows[0].stock_qty) < diff) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Insufficient stock to increase waste amount" });
      }
    }

    // 3. Update Waste record
    const result = await client.query(
      `UPDATE "Waste"
       SET waste_qty = $1,
           reason = $2,
           recorded_at = CURRENT_TIMESTAMP
       WHERE waste_id = $3
       RETURNING *`,
      [waste_qty, reason, id]
    );

    // 4. Adjust Raw Material stock
    await client.query(
      'UPDATE "Raw_Material" SET stock_qty = stock_qty - $1 WHERE rm_id = $2',
      [diff, rm_id]
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "Waste record updated and stock adjusted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("UPDATE WASTE ERROR:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    if (client) client.release();
  }
};

/**
 * ✅ Delete Waste Record
 * Note: Deleting waste should ideally restore the wasted stock back to "Raw_Material"
 */
export const deleteWaste = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // 1. Get waste record to restore stock
    const wasteRecord = await client.query('SELECT rm_id, waste_qty FROM "Waste" WHERE waste_id = $1', [id]);
    if (wasteRecord.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Waste record not found" });
    }

    const { rm_id, waste_qty } = wasteRecord.rows[0];

    // 2. Restore stock
    await client.query(
        'UPDATE "Raw_Material" SET stock_qty = stock_qty + $1 WHERE rm_id = $2',
        [waste_qty, rm_id]
    );

    // 3. Delete record
    await client.query('DELETE FROM "Waste" WHERE waste_id = $1', [id]);

    await client.query("COMMIT");

    res.status(200).json({
      message: "Waste record deleted and stock restored successfully",
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("DELETE WASTE ERROR:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    if (client) client.release();
  }
};

/**
 * 🔥 Get Waste Percentage (Dashboard Summary)
 */
export const getWastePercentage = async (req, res) => {
  try {
    // This query calculates total waste percentage per material
    // Percentage = (Total Wasted / (Current Stock + Total Wasted)) * 100
    const result = await pool.query(`
      SELECT 
        rm.rm_id,
        rm.rm_name,
        rm.stock_qty AS current_stock,
        COALESCE(SUM(w.waste_qty), 0) AS total_wasted,
        CASE 
          WHEN (rm.stock_qty + COALESCE(SUM(w.waste_qty), 0)) > 0 
          THEN ROUND((COALESCE(SUM(w.waste_qty), 0) / (rm.stock_qty + COALESCE(SUM(w.waste_qty), 0))) * 100, 2)
          ELSE 0
        END AS waste_percentage
      FROM "Raw_Material" rm
      LEFT JOIN "Waste" w ON rm.rm_id = w.rm_id
      GROUP BY rm.rm_id, rm.rm_name, rm.stock_qty
      ORDER BY waste_percentage DESC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("WASTE PERCENTAGE ERROR:", error);
    res.status(500).json({ error: "Server error" });
  }
};