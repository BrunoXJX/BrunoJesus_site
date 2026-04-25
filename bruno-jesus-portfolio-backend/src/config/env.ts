import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

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
  RATE_LIMIT_CONTACT_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_CONTACT_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_GLOBAL_WINDOW_MINUTES: z.coerce.number().int().positive().default(15)
})
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== "production") {
      return;
    }

    if (values.RESEND_API_KEY.includes("replace_with")) {
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

    if (values.DATABASE_URL.includes("postgres:postgres@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must not use the default postgres:postgres credentials in production."
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

export function getAllowedCorsOrigins(): string[] {
  const origins = new Set<string>([env.FRONTEND_URL]);

  if (!isProduction) {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:5173");
    origins.add("http://localhost:5500");
  }

  return [...origins];
}
