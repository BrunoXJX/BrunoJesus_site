import { z } from "zod";

export const createCalendarEventSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1, "O título da reunião é obrigatório.")
    .max(200, "O título é demasiado longo."),
  description: z
    .string()
    .trim()
    .max(2000, "A descrição é demasiado longa.")
    .optional(),
  startAt: z
    .string()
    .datetime({ message: "A data de início deve ser uma data ISO 8601 válida." }),
  endAt: z
    .string()
    .datetime({ message: "A data de fim deve ser uma data ISO 8601 válida." }),
  attendees: z
    .array(z.string().email("Endereço de email inválido."))
    .max(50, "Não é possível convidar mais do que 50 participantes.")
    .optional(),
  createMeetLink: z.boolean().default(true)
}).refine((data) => new Date(data.startAt) < new Date(data.endAt), {
  message: "A data de início deve ser anterior à data de fim.",
  path: ["endAt"]
});

export const calendarEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export interface CreateCalendarEventInput {
  summary: string;
  description?: string;
  startAt: string;
  endAt: string;
  attendees?: string[];
  createMeetLink?: boolean;
}

export interface CalendarEventsQuery {
  limit?: number;
}
