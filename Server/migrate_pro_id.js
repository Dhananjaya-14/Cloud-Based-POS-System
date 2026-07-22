import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await client.connect();
  try {
    // Add pro_id column to purchase_item (nullable FK to Product)
    await client.query(`
      ALTER TABLE purchase_item
      ADD COLUMN IF NOT EXISTS pro_id INTEGER REFERENCES "Product"(pro_id) ON DELETE SET NULL
    `);
    console.log('Added pro_id to purchase_item');

    // Make rm_id nullable so either rm_id or pro_id can be set
    await client.query(`
      ALTER TABLE purchase_item ALTER COLUMN rm_id DROP NOT NULL
    `);
    console.log('Made rm_id nullable in purchase_item');

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
