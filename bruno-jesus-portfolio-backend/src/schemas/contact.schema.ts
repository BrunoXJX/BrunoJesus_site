import { z, type ZodError } from "zod";

import type { ValidationErrorItem } from "../types/contact.types";
import { sanitizeMultiline, sanitizeSingleLine } from "../utils/sanitize";

export const contactRequestSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required." })
      .transform((value) => sanitizeSingleLine(value))
      .refine((value) => value.length >= 2, {
        message: "Name must be at least 2 characters."
      })
      .refine((value) => value.length <= 80, {
        message: "Name must be at most 80 characters."
      }),
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .toLowerCase()
      .max(120, "Email must be at most 120 characters.")
      .email("Invalid email address."),
    subject: z
      .string()
      .optional()
      .transform((value) => sanitizeSingleLine(value ?? ""))
      .refine((value) => value.length <= 120, {
        message: "Subject must be at most 120 characters."
      })
      .transform((value) => (value.length === 0 ? "Portfolio Contact" : value)),
    message: z
      .string({ required_error: "Message is required." })
      .transform((value) => sanitizeMultiline(value))
      .refine((value) => value.length >= 10, {
        message: "Message must be at least 10 characters."
      })
      .refine((value) => value.length <= 3000, {
        message: "Message must be at most 3000 characters."
      }),
    website: z
      .string()
      .optional()
      .transform((value) => sanitizeSingleLine(value ?? ""))
  })
  .strip();

export type ContactRequestInput = z.input<typeof contactRequestSchema>;
export type ContactRequestData = z.output<typeof contactRequestSchema>;

export function formatContactValidationErrors(error: ZodError): ValidationErrorItem[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message
  }));
}
