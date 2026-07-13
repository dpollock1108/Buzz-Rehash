import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getDb } from "./db/connection.js";
import { initializeDatabase } from "./db/schema.js";
import { attachUser } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { celebritiesRouter } from "./routes/celebrities.js";
import { postsRouter } from "./routes/posts.js";
import { eventsRouter } from "./routes/events.js";
import { relationshipsRouter } from "./routes/relationships.js";

// Load .env from repo root regardless of CWD (workspace scripts run from server/)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

// Initialize database
initializeDatabase(getDb());

// Mount routes
app.use(authRouter);
app.use(celebritiesRouter);
app.use(postsRouter);
app.use(eventsRouter);
app.use(relationshipsRouter);

app.listen(PORT, () => {
  console.log(`Buzz Rehash server running on http://localhost:${PORT}`);
});
