import dotenv from 'dotenv';
dotenv.config({ path: './Server/.env' });
import pool from './Server/config/database.js';
pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'purchase_item'`).then(res => {
  console.log(JSON.stringify(res.rows));
  process.exit();
});
