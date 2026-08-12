import pg from "pg";

const { Pool } = pg;

// Shared Linode Postgres (db "2026"), same instance the sibling diagrams /
// mindmaps apps use. Self-signed cert on the remote host, so verification is
// off when DATABASE_SSL=true (connection stays TLS-encrypted). Matches the
// diagrams app's lib/db.ts.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

export default pool;
