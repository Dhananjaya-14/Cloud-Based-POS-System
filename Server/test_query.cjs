const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_T4LcFVzWHN2O@ep-raspy-poetry-adqkbiu1-pooler.c-2.us-east-1.aws.neon.tech/POS_DB?sslmode=require' });
client.connect().then(() => client.query('SELECT rm_id, rm_name, unit, stock_qty FROM "Raw_Material" WHERE rm_id = 39')).then(res => { console.table(res.rows); client.end(); }).catch(console.error);
