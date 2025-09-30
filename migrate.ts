// migrate.ts
import { readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

// Connexion PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "genzdb",
  password: process.env.DB_PASSWORD || "postgres",
  port: Number(process.env.DB_PORT) || 5432,
});

async function migrate() {
  try {
    const sqlPath = path.join(process.cwd(), "0000_thick_tinkerer.sql");
    const sql = readFileSync(sqlPath, "utf-8");
    await pool.query(sql);
    console.log("✅ Migration exécutée avec succès !");
  } catch (err) {
    console.error("❌ Erreur migration :", err);
  } finally {
    await pool.end();
  }
}

migrate();
