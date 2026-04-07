import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root .env (matches README: cp .env.example .env)
config({ path: path.join(__dirname, "..", ".env") });
// Optional backend/.env overrides
config({ path: path.join(__dirname, ".env"), override: true });
