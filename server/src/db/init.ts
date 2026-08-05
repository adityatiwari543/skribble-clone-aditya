import fs from "fs";
import path from "path";
import { pool } from "./pool";
import { WORD_LIST } from "../data/words";

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
  console.log("Schema created.");

  for (const category of Object.keys(WORD_LIST)) {
    for (const word of WORD_LIST[category]) {
      await pool.query(
        `INSERT INTO words (word, category) VALUES ($1, $2)
         ON CONFLICT (word) DO NOTHING`,
        [word, category]
      );
    }
  }
  console.log("Word list seeded.");
  await pool.end();
}

init().catch((err) => {
  console.error("DB init failed:", err);
  process.exit(1);
});
