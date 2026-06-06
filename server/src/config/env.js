/**
 * @module config/env
 * @description Validates and exports all environment variables using Zod.
 * Fails fast on startup if required variables are missing.
 */

const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root (server/../.env)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });
// Also try server-local .env
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const envSchema = z.object({
  // ─── Required ──────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // ─── Optional with defaults ────────────────────────────────────────
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(25),
  BATCH_CONCURRENCY: z.coerce.number().int().positive().default(10),
  ENRICHMENT_CACHE_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // ─── Email (optional) ─────────────────────────────────────────────
  SMTP_HOST: z.string().default('smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@recruitiq.dev'),

  // ─── Client URL ───────────────────────────────────────────────────
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  const formatted = parsed.error.format();
  for (const [key, value] of Object.entries(formatted)) {
    if (key === '_errors') continue;
    if (value && value._errors && value._errors.length > 0) {
      console.error(`   ${key}: ${value._errors.join(', ')}`);
    }
  }
  process.exit(1);
}

/** @type {z.infer<typeof envSchema>} */
const config = Object.freeze(parsed.data);

module.exports = { config };
