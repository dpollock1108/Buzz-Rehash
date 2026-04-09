import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import express from "express";
import cors from "cors";
import { getDb } from "./db/connection.js";
import { initializeDatabase } from "./db/schema.js";
import { celebritiesRouter } from "./routes/celebrities.js";

// Load .env from repo root regardless of CWD (workspace scripts run from server/)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase(getDb());

// Mount routes
app.use(celebritiesRouter);

app.listen(PORT, () => {
  console.log(`Buzz Rehash server running on http://localhost:${PORT}`);
});
