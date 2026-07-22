import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE "public"."purchase_item" ADD COLUMN IF NOT EXISTS "unit" VARCHAR(20) DEFAULT NULL`);
    console.log('✅ unit column added to purchase_item');
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
migrate();
