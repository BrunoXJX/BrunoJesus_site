import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

function parseOrigin(value: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue === "*") {
    throw new Error("Wildcard origins are not allowed.");
  }

  return new URL(trimmedValue).origin;
}

function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => parseOrigin(origin));
}

const envSchema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  HOST: z.string().min(1).default("0.0.0.0"),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL."),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required."),
  CONTACT_RECEIVER_EMAIL: z.string().email("CONTACT_RECEIVER_EMAIL must be a valid email."),
  CONTACT_FROM_EMAIL: z
    .string()
    .min(3, "CONTACT_FROM_EMAIL is required.")
    .max(200, "CONTACT_FROM_EMAIL is too long.")
    .refine((value) => value.includes("@"), {
      message: "CONTACT_FROM_EMAIL must include an email address."
    }),
  CORS_ORIGINS: z.string().default(""),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().int().min(1024).max(8_388_608).default(1_048_576),
  EMAIL_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(5000),
  RATE_LIMIT_CONTACT_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_CONTACT_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_GLOBAL_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().url("GOOGLE_REDIRECT_URI must be a valid URL.").optional(),
  LAB_ALLOWED_EMAILS: z.string().default(""),
  LAB_SESSION_SECRET: z.string().min(16).default("dev_lab_session_secret_replace_in_production"),
  TOKEN_ENCRYPTION_KEY: z.string().min(16).default("dev_token_encryption_key_replace_in_production"),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.5"),
  OPENAI_TRANSCRIBE_MODEL: z.string().min(1).default("whisper-1"),
  OPENAI_WEB_SEARCH_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true")
})
  .superRefine((values, ctx) => {
    try {
      parseOrigin(values.FRONTEND_URL);
      parseCorsOrigins(values.CORS_ORIGINS);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: error instanceof Error ? error.message : "Invalid CORS origin."
      });
    }

    if (values.NODE_ENV !== "production") {
      return;
    }

    if (!values.FRONTEND_URL.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FRONTEND_URL"],
        message: "FRONTEND_URL must use HTTPS in production."
      });
    }

    if (values.FRONTEND_URL.includes("localhost") || values.FRONTEND_URL.includes("127.0.0.1")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FRONTEND_URL"],
        message: "FRONTEND_URL must be the real public domain in production."
      });
    }

    if (!values.TRUST_PROXY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TRUST_PROXY"],
        message: "TRUST_PROXY must be true in production when the app is behind a domain/proxy."
      });
    }

    if (values.RESEND_API_KEY.includes("replace_with") || !values.RESEND_API_KEY.startsWith("re_")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY must be a real production key."
      });
    }

    if (values.CONTACT_RECEIVER_EMAIL.endsWith("@example.com")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CONTACT_RECEIVER_EMAIL"],
        message: "CONTACT_RECEIVER_EMAIL must be a real production email."
      });
    }

    if (values.CONTACT_FROM_EMAIL.includes("onboarding@resend.dev")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CONTACT_FROM_EMAIL"],
        message: "CONTACT_FROM_EMAIL must use a verified production sender/domain."
      });
    }

    if (values.DATABASE_URL.includes("postgres:postgres@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must not use the default postgres:postgres credentials in production."
      });
    }

    if (values.DATABASE_URL.includes("localhost") || values.DATABASE_URL.includes("127.0.0.1")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must point to a production PostgreSQL database."
      });
    }

    if (!values.GOOGLE_CLIENT_ID || values.GOOGLE_CLIENT_ID.includes("replace_with")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_ID"],
        message: "GOOGLE_CLIENT_ID must be configured in production."
      });
    }

    if (!values.GOOGLE_CLIENT_SECRET || values.GOOGLE_CLIENT_SECRET.includes("replace_with")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_SECRET"],
        message: "GOOGLE_CLIENT_SECRET must be configured in production."
      });
    }

    if (!values.GOOGLE_REDIRECT_URI?.startsWith("https://")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_REDIRECT_URI"],
        message: "GOOGLE_REDIRECT_URI must use HTTPS in production."
      });
    }

    if (!values.LAB_ALLOWED_EMAILS.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["LAB_ALLOWED_EMAILS"],
        message: "LAB_ALLOWED_EMAILS must include at least one authorized email in production."
      });
    }

    if (
      values.LAB_SESSION_SECRET.includes("replace") ||
      values.LAB_SESSION_SECRET.includes("dev_") ||
      values.LAB_SESSION_SECRET.length < 32
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["LAB_SESSION_SECRET"],
        message: "LAB_SESSION_SECRET must be a strong production secret."
      });
    }

    if (
      values.TOKEN_ENCRYPTION_KEY.includes("replace") ||
      values.TOKEN_ENCRYPTION_KEY.includes("dev_") ||
      values.TOKEN_ENCRYPTION_KEY.length < 32
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TOKEN_ENCRYPTION_KEY"],
        message: "TOKEN_ENCRYPTION_KEY must be a strong production secret."
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedIssues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment variables:\n${formattedIssues}`);
}

export const env = parsedEnv.data;
export const SERVICE_NAME = "bruno-jesus-portfolio-backend";
export const API_VERSION = "1.0.0";
export const isProduction = env.NODE_ENV === "production";

export function getGoogleRedirectUri(): string {
  return env.GOOGLE_REDIRECT_URI ?? `${parseOrigin(env.FRONTEND_URL)}/api/gmail/auth/callback`;
}

export function getAllowedLabEmails(): string[] {
  return env.LAB_ALLOWED_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedCorsOrigins(): string[] {
  const origins = new Set<string>([parseOrigin(env.FRONTEND_URL)]);

  parseCorsOrigins(env.CORS_ORIGINS).forEach((origin) => origins.add(origin));

  if (!isProduction) {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:5173");
    origins.add("http://localhost:5500");
  }

  return [...origins];
}
