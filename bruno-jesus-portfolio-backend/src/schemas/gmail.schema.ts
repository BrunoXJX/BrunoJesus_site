import { z } from "zod";

export const gmailMessageIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u, "Identificador Gmail invalido.");

export const gmailMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

export const gmailAuthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(16)
});

export const gmailReplyBodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "A resposta deve ter pelo menos 2 caracteres.")
    .max(8000, "A resposta e demasiado longa."),
  suggestionId: z.string().max(80).optional()
});

export type GmailMessagesQuery = z.infer<typeof gmailMessagesQuerySchema>;
export type GmailAuthCallbackQuery = z.infer<typeof gmailAuthCallbackQuerySchema>;
export type GmailReplyBody = z.infer<typeof gmailReplyBodySchema>;
