import pool from './config/database.js'; async function run() { try { const r = await pool.query('SELECT oi.\
orderItem_id\, oi.\Bpro_id\, oi.pro_quantity, oi.unit_price, oi.total_price, bp.pro_name, bp.\
Pro_Price\ FROM public.\ORDER_ITEM\ AS oi INNER JOIN public.\Branch_Product\ AS bp ON oi.\Bpro_id\ = bp.\Bpro_id\ LIMIT 1'); console.log(r.rows); } catch(e) { console.error('ERROR::::', e.message); } finally { await pool.end(); } } run();
