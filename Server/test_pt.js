import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function check() {
  await client.connect();
  const res = await client.query('SELECT pro_name, product_type FROM "Product" WHERE pro_name ILIKE $1 OR pro_name ILIKE $2', ['%coca%', '%sprite%']);
  console.log(res.rows);
  await client.end();
}
check();
