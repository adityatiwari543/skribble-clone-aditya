import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const useSSL = process.env.DB_SSL === "true";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error on idle client", err);
});
