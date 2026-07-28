const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_T4LcFVzWHN2O@ep-raspy-poetry-adqkbiu1-pooler.c-2.us-east-1.aws.neon.tech/POS_DB?sslmode=require' });
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Branch_Product'")).then(res => { console.table(res.rows); client.end(); }).catch(console.error);
