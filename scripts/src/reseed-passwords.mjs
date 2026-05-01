import bcrypt from "bcrypt";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const hash = await bcrypt.hash("password123", 10);
await pool.query("UPDATE users SET password = $1", [hash]);
const { rows } = await pool.query("SELECT id, email FROM users ORDER BY id");
console.log("Updated passwords for:", rows.map(r => r.email).join(", "));
await pool.end();
