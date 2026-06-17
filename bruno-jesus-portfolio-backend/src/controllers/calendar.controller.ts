import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodSchema } from "zod";
import { createCalendarEventSchema, calendarEventsQuerySchema, type CreateCalendarEventInput, type CalendarEventsQuery } from "../schemas/calendar.schema";
import type { CalendarService } from "../services/calendar.service";
import { AppError } from "../utils/AppError";

const LAB_SESSION_COOKIE = "bj_lab_session";

function parseOrThrow<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("Erro de validação.", {
        statusCode: 400,
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }
    throw error;
  }
}

function getSessionToken(request: FastifyRequest): string | null {
  const rawCookie = request.cookies[LAB_SESSION_COOKIE];
  if (!rawCookie) return null;
  const unsigned = request.unsignCookie(rawCookie);
  return unsigned.valid ? unsigned.value : null;
}

interface CalendarControllerDependencies {
  calendarService: CalendarService;
}

export function createCalendarController({ calendarService }: CalendarControllerDependencies) {
  return {
    async createEvent(
      request: FastifyRequest<{ Body: CreateCalendarEventInput }>,
      reply: FastifyReply
    ) {
      const input = parseOrThrow(createCalendarEventSchema, request.body) as CreateCalendarEventInput;
      const event = await calendarService.createEvent(getSessionToken(request), input);

      return reply.status(201).send({
        success: true,
        message: "Evento criado com sucesso.",
        data: {
          id: event.id,
          summary: event.summary,
          description: event.description,
          startAt: event.start?.dateTime,
          endAt: event.end?.dateTime,
          hangoutLink: event.hangoutLink || null,
          status: event.status
        }
      });
    },

    async listEvents(
      request: FastifyRequest<{ Querystring: CalendarEventsQuery }>,
      reply: FastifyReply
    ) {
      const query = parseOrThrow(calendarEventsQuerySchema, request.query) as CalendarEventsQuery;
      const events = await calendarService.listEvents(getSessionToken(request), query.limit ?? 10);

      return reply.send({
        success: true,
        data: events.map((event) => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          startAt: event.start?.dateTime || event.start?.date,
          endAt: event.end?.dateTime || event.end?.date,
          hangoutLink: event.hangoutLink || null
        }))
      });
    }
  };
}
