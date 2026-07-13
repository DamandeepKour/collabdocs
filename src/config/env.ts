import { z } from "zod";

/**
 * Treat empty strings as undefined so optional secrets don't fail validation.
 */
const optionalNonEmpty = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().url().optional(),
);

const optionalSecret = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(32).optional(),
);

/**
 * Environment variable schema.
 * Validated at startup so misconfiguration fails fast.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: optionalUrl,

  AUTH_SECRET: optionalSecret,
  AUTH_URL: optionalUrl,
  AUTH_GOOGLE_ID: optionalNonEmpty,
  AUTH_GOOGLE_SECRET: optionalNonEmpty,
  AUTH_GITHUB_ID: optionalNonEmpty,
  AUTH_GITHUB_SECRET: optionalNonEmpty,

  AI_PROVIDER: z.enum(["openai", "gemini", "groq"]).default("groq"),
  OPENAI_API_KEY: optionalNonEmpty,
  GOOGLE_GENERATIVE_AI_API_KEY: optionalNonEmpty,
  GROQ_API_KEY: optionalNonEmpty,
  AI_MODEL: optionalNonEmpty,

  NEXT_PUBLIC_WS_URL: optionalNonEmpty,

  MAX_PAYLOAD_BYTES: z.coerce.number().int().positive().default(1_048_576),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables. Check .env.example.");
  }

  return parsed.data;
}

/**
 * Server-only env. Do not import from Client Components.
 */
export const env = loadEnv();
