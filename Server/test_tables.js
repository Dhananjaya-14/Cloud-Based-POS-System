import pool from './config/database.js'; async function run() { try { const r = await pool.query('SELECT * FROM public.\
TABLES\ LIMIT 1'); console.log(r.rows); } catch(e) {} finally { await pool.end(); } } run();
