import pool from './config/database.js';

async function runAllMigrations() {
  try {
    console.log("==========================================");
    console.log("1. Starting Branch Constraints Migration...");
    console.log("==========================================");
    
    // Drop the 3 problematic global unique constraints
    await pool.query('ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_B_email_key"');
    console.log('  ✓ Dropped Branch_B_email_key');

    await pool.query('ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_B_conNo_key"');
    console.log('  ✓ Dropped Branch_B_conNo_key');

    await pool.query('ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_B_address_key"');
    console.log('  ✓ Dropped Branch_B_address_key');

    // Add company-scoped unique constraints instead
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Branch_email_per_company"
      ON "Branch" ("com_id", "B_email")
    `);
    console.log('  ✓ Added company-scoped unique index: (com_id, B_email)');

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Branch_conNo_per_company"
      ON "Branch" ("com_id", "B_conNo")
    `);
    console.log('  ✓ Added company-scoped unique index: (com_id, B_conNo)');

    console.log('✅ Branch Constraints fixed!\n');

    console.log("==========================================");
    console.log("2. Starting Package Data Migration...");
    console.log("==========================================");

    // Ensure the Package table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Package" (
        package_id SERIAL PRIMARY KEY,
        package_name VARCHAR(255) NOT NULL,
        features JSONB NOT NULL
      );
    `);
    console.log("  ✓ Checked Package table.");

    // Define the packages and their features (constraints/limits)
    const packages = [
      {
        package_id: 1,
        package_name: 'Basic',
        features: {
          max_users: 5,
          max_branches: 2,
          has_inventory: true,
          has_kitchen: true
        }
      },
      {
        package_id: 2,
        package_name: 'Standard',
        features: {
          max_users: 15,
          max_branches: 3,
          has_inventory: true,
          has_kitchen: true,
          has_suppliers: true,
          has_reports: true,
          has_promotions: false,
          has_delivery: false
        }
      },
      {
        package_id: 3,
        package_name: 'Premium',
        features: {
          max_users: 999,
          max_branches: 999,
          has_inventory: true,
          has_kitchen: true,
          has_suppliers: true,
          has_reports: true,
          has_promotions: true,
          has_delivery: true
        }
      }
    ];

    // Upsert packages into the database
    for (const pkg of packages) {
      await pool.query(`
        INSERT INTO "Package" (package_id, package_name, features)
        VALUES ($1, $2, $3)
        ON CONFLICT (package_id) 
        DO UPDATE SET package_name = EXCLUDED.package_name, features = EXCLUDED.features;
      `, [pkg.package_id, pkg.package_name, JSON.stringify(pkg.features)]);
      
      console.log(`  ✓ Successfully migrated package: ${pkg.package_name}`);
    }

    console.log('✅ Package Data Migration completed!');
    console.log("==========================================");

  } catch (err) {
    console.error("Error during migration:", err);
  } finally {
    pool.end();
  }
}

runAllMigrations();
