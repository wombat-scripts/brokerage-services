import { createPgPool, applyMigrations } from "./postgres.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required to migrate");
  process.exit(1);
}

const pool = createPgPool(databaseUrl);
try {
  const applied = await applyMigrations(pool);
  if (applied.length === 0) {
    console.log("No pending migrations");
  } else {
    console.log(`Applied: ${applied.join(", ")}`);
  }
} finally {
  await pool.end();
}
