import pool from "./config/database.js"; async function run() { try { const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = \
public\"); console.log(r.rows); } catch(e) {console.log(e)} finally { await pool.end(); } } run();
