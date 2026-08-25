import pool from './config/database.js';

async function main() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("TABLES IN DATABASE:", tables);

    for (const table of tables) {
      const colsRes = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY column_name
      `, [table]);
      console.log(`\nTable: ${table}`);
      colsRes.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
