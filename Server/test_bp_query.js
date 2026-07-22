import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function testQuery() {
  await client.connect();
  try {
    const result = await client.query(`
      SELECT
        bp."Bpro_id",
        bp."pro_name",
        bp." pro_shortname" AS "pro_shortname",
        bp." pro_image" AS "pro_image",
        bp." pro_des" AS "pro_des",
        bp."pro_quantity",
        bp." Pro_Price" AS "pro_price",
        bp."Cat_id" AS "cat_id",
        bp."pro_id",
        bp."B_id",
        bp."low_stock_limit",
        c."cat_name",
        p."stations",
        p."product_type"
      FROM "public"."Branch_Product" bp
      LEFT JOIN "public"."category" c ON bp."Cat_id" = c."cat_id"
      LEFT JOIN "public"."Product"   p ON bp."pro_id" = p."pro_id"
      LIMIT 10
    `);
    console.log('Success, rows:', result.rows.length);
  } catch(e) {
    console.error('SQL Error:', e);
  } finally {
    await client.end();
  }
}
testQuery();
