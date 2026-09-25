import "dotenv/config";
import { z } from "zod";

/**
 * Every env var the app needs, validated once at startup. Import `env` from
 * here instead of reading `process.env` directly — a missing or malformed
 * var then fails fast with a clear message instead of surfacing as a weird
 * runtime bug three files away.
 */
const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Fix .env (see .env.example) before starting the server.");
}

export const env = parsed.data;
