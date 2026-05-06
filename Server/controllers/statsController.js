import pool from "../config/database.js";

export async function getOverview(req, res, next) {
  try {
    const tb = await pool.query(`SELECT COUNT(*)::int AS total_branches FROM "Branch"`);
    const totalBranches = tb.rows[0]?.total_branches ?? 0;

    const rev = await pool.query(
      `SELECT COALESCE(SUM("or_totalCostWtax"),0)::numeric(12,2) AS total_revenue FROM "ORDER" WHERE or_status = 'completed'`
    );
    const totalRevenue = Number(rev.rows[0]?.total_revenue ?? 0);

    const to = await pool.query(`SELECT COUNT(*)::int AS total_orders FROM "ORDER"`);
    const totalOrders = to.rows[0]?.total_orders ?? 0;

    res.json({ totalBranches, totalRevenue, totalOrders });
  } catch (err) {
    next(err);
  }
}

export async function getBranchStats(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT b."B_id", b."B_name",
              COALESCE(SUM(o."or_totalCostWtax"),0)::numeric(12,2) AS revenue,
              COALESCE(COUNT(o.or_id),0) AS orders
       FROM "Branch" b
       LEFT JOIN "ORDER" o ON o.b_id = b."B_id" AND o.or_status = 'completed'
       GROUP BY b."B_id", b."B_name"
       ORDER BY revenue DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}