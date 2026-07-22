const { Client } = require('pg');

const client = new Client({ 
  connectionString: 'postgresql://neondb_owner:npg_T4LcFVzWHN2O@ep-raspy-poetry-adqkbiu1-pooler.c-2.us-east-1.aws.neon.tech/POS_DB?sslmode=require'
});

async function migrate() {
  try {
    await client.connect();
    console.log("Connected to Neon DB.");

    await client.query("BEGIN");

    // purchase_item updates
    console.log("Altering purchase_item...");
    await client.query('ALTER TABLE "purchase_item" ADD COLUMN IF NOT EXISTS "pro_id" INTEGER DEFAULT NULL');
    await client.query('ALTER TABLE "purchase_item" ALTER COLUMN "rm_id" DROP NOT NULL');
    
    // Drop the constraint if it exists (for idempotency)
    try {
      await client.query('ALTER TABLE "purchase_item" DROP CONSTRAINT "purchase_item_check"');
    } catch(e) {}
    await client.query('ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_check" CHECK (("rm_id" IS NOT NULL AND "pro_id" IS NULL) OR ("rm_id" IS NULL AND "pro_id" IS NOT NULL))');

    // Waste updates
    console.log("Altering Waste...");
    await client.query('ALTER TABLE "public"."Waste" ADD COLUMN IF NOT EXISTS "pro_id" INTEGER DEFAULT NULL');
    await client.query('ALTER TABLE "public"."Waste" ALTER COLUMN "rm_id" DROP NOT NULL');
    
    try {
      await client.query('ALTER TABLE "public"."Waste" DROP CONSTRAINT "waste_check"');
    } catch(e) {}
    await client.query('ALTER TABLE "public"."Waste" ADD CONSTRAINT "waste_check" CHECK (("rm_id" IS NOT NULL AND "pro_id" IS NULL) OR ("rm_id" IS NULL AND "pro_id" IS NOT NULL))');

    await client.query("COMMIT");
    console.log("Migration successful.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
