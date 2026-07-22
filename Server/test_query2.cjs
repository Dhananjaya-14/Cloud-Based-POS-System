const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_T4LcFVzWHN2O@ep-raspy-poetry-adqkbiu1-pooler.c-2.us-east-1.aws.neon.tech/POS_DB?sslmode=require' });
client.connect().then(() => client.query('SELECT pi.pi_id, po.po_id, rm.rm_name, pi.qty, pi.unit, po.status FROM purchase_item pi JOIN purchase_order po ON pi.po_id = po.po_id JOIN "Raw_Material" rm ON pi.rm_id = rm.rm_id ORDER BY pi.pi_id DESC LIMIT 5')).then(res => { console.table(res.rows); client.end(); }).catch(console.error);
