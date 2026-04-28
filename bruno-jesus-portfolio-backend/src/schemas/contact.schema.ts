import { z, type ZodError } from "zod";

import type { ValidationErrorItem } from "../types/contact.types";
import { sanitizeMultiline, sanitizeSingleLine } from "../utils/sanitize";

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;

function countLinks(value: string): number {
  return value.match(URL_PATTERN)?.length ?? 0;
}

export const contactRequestSchema = z
  .object({
    name: z
      .string({ required_error: "Nome obrigatório." })
      .transform((value) => sanitizeSingleLine(value))
      .refine((value) => value.length >= 2, {
        message: "O nome deve ter pelo menos 2 caracteres."
      })
      .refine((value) => value.length <= 80, {
        message: "O nome deve ter no máximo 80 caracteres."
      }),
    email: z
      .string({ required_error: "Email obrigatório." })
      .trim()
      .toLowerCase()
      .max(120, "O email deve ter no máximo 120 caracteres.")
      .email("Endereço de email inválido."),
    subject: z
      .string()
      .optional()
      .transform((value) => sanitizeSingleLine(value ?? ""))
      .refine((value) => value.length <= 120, {
        message: "O assunto deve ter no máximo 120 caracteres."
      })
      .transform((value) => (value.length === 0 ? "Contacto pelo portefólio" : value)),
    message: z
      .string({ required_error: "Mensagem obrigatória." })
      .transform((value) => sanitizeMultiline(value))
      .refine((value) => value.length >= 10, {
        message: "A mensagem deve ter pelo menos 10 caracteres."
      })
      .refine((value) => value.length <= 3000, {
        message: "A mensagem deve ter no máximo 3000 caracteres."
      })
      .refine((value) => countLinks(value) <= 4, {
        message: "A mensagem contém demasiadas ligações."
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
