import pool from './config/database.js'; async function run() { try { const r = await pool.query('SELECT b.b_name, b.b_id FROM \
User\ u LEFT JOIN \Branch\ b ON b.\U_id\ = u.u_id WHERE u.u_id = 9 LIMIT 1'); console.log(r.rows); } catch(e) {console.log(e)} finally { await pool.end(); } } run();
