// utils/tableOccupancy.js
// A table can hold several parties (orders) at once, so it may only go back to
// "available" when none of its orders are still open.

import pool from "../config/database.js";

export const OPEN_ORDER_STATUSES = ["pending", "hold", "preparing"];

// An order is "open" while it is pending / hold / preparing AND not yet paid.
// Paying does not change or_status, so a paid party would otherwise keep the
// table occupied forever once the last party pays.
// Returns the first open order on the table (optionally ignoring one order), or null.
export async function findOpenOrderOnTable(db, tableId, excludeOrId = null) {
  const { rows } = await (db || pool).query(
    `SELECT o.or_id FROM "ORDER" o
     WHERE o.table_id = $1
       AND o.or_status = ANY($2::text[])
       AND ($3::int IS NULL OR o.or_id <> $3::int)
       AND NOT EXISTS (
         SELECT 1 FROM "Payment" p WHERE p.or_id = o.or_id AND p.pay_status = 'paid'
       )
     LIMIT 1`,
    [tableId, OPEN_ORDER_STATUSES, excludeOrId],
  );
  return rows[0] || null;
}

// Seats a party: marks the table "occupied" (it may already be, with another party).
// Returns true when the status actually changed.
export async function occupyTable(db, tableId) {
  if (!tableId) return false;
  const { rowCount } = await (db || pool).query(
    `UPDATE "TABLES" SET table_status = 'occupied'
     WHERE table_id = $1 AND table_status <> 'occupied'`,
    [tableId],
  );
  return rowCount > 0;
}

// Marks the table "available" only if no other open order remains on it.
// `excludeOrId` is the order that is finishing (paid / cancelled / moved away).
// Locks the table row so two parties finishing at the same moment can't both
// see each other as still open and leave the table stuck as "occupied".
// Pass a transaction client when already inside a transaction; with the pool
// (or nothing) it runs in its own short transaction.
// Returns true when the table was freed.
export async function releaseTableIfNoOpenOrders(db, tableId, excludeOrId = null) {
  if (!tableId) return false;

  if (!db || db === pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const freed = await releaseTableIfNoOpenOrders(client, tableId, excludeOrId);
      await client.query("COMMIT");
      return freed;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  await db.query(`SELECT table_id FROM "TABLES" WHERE table_id = $1 FOR UPDATE`, [tableId]);

  if (await findOpenOrderOnTable(db, tableId, excludeOrId)) return false;

  await db.query(`UPDATE "TABLES" SET table_status = 'available' WHERE table_id = $1`, [tableId]);
  return true;
}
