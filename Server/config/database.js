import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Log unexpected errors on idle clients (e.g. DB restarted / network drop)
pool.on("error", (err) => {
  console.error(`✗ Database connection lost: ${err.message}`);
});

// Describe the target DB without exposing credentials
function describeTarget() {
  try {
    const url = new URL(process.env.DATABASE_URL);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return "unknown (check DATABASE_URL)";
  }
}

// Test the connection and print the result to the terminal
export async function checkDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    console.error("✗ Database not connected: DATABASE_URL is not set in .env");
    return false;
  }

  try {
    const { rows } = await pool.query("SELECT current_database() AS db, NOW() AS now");
    console.log(`✓ Database connected: ${describeTarget()} (db: ${rows[0].db})`);
    return true;
  } catch (err) {
    // Connection failures can be an AggregateError with an empty message
    const reason =
      err.message || err.code || err.errors?.[0]?.message || String(err);
    console.error(`✗ Database not connected: ${describeTarget()} → ${reason}`);
    return false;
  }
}

export default pool;
