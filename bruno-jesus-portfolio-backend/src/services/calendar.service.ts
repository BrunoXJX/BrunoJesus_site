import type { FastifyBaseLogger } from "fastify";
import { google, calendar_v3 } from "googleapis";
import { env, getGoogleRedirectUri } from "../config/env";
import { AppError } from "../utils/AppError";
import { decryptSecret, hashSecret, createSecretToken } from "../utils/labCrypto";
import type { CreateCalendarEventInput } from "../schemas/calendar.schema";

interface CalendarAccountRecord {
  id: string;
  refreshTokenEncrypted: string;
}

export interface CalendarService {
  createEvent(sessionToken: string | null, input: CreateCalendarEventInput): Promise<calendar_v3.Schema$Event>;
  listEvents(sessionToken: string | null, limit: number): Promise<calendar_v3.Schema$Event[]>;
}

interface CalendarServiceDependencies {
  prisma: any;
  logger: FastifyBaseLogger;
}

export function createCalendarService({ prisma, logger }: CalendarServiceDependencies): CalendarService {
  const serviceLogger = logger.child({ service: "calendar-service" });

  async function resolveSession(sessionToken: string | null): Promise<CalendarAccountRecord> {
    if (!sessionToken) {
      throw new AppError("Liga a tua conta Google para continuar.", { statusCode: 401 });
    }

    const session = await prisma.gmailLabSession.findUnique({
      where: { sessionTokenHash: hashSecret(sessionToken) },
      include: { account: true }
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new AppError("Sessão do laboratório expirada.", { statusCode: 401 });
    }

    return session.account;
  }

  function createOAuthClient() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      getGoogleRedirectUri()
    );
  }

  return {
    async createEvent(sessionToken: string | null, input: CreateCalendarEventInput): Promise<calendar_v3.Schema$Event> {
      const account = await resolveSession(sessionToken);
      const refreshToken = decryptSecret(account.refreshTokenEncrypted);

      const auth = createOAuthClient();
      auth.setCredentials({ refresh_token: refreshToken });
      const calendar = google.calendar({ version: "v3", auth });

      const requestBody: calendar_v3.Schema$Event = {
        summary: input.summary,
        description: input.description || "",
        start: {
          dateTime: input.startAt,
          timeZone: "UTC"
        },
        end: {
          dateTime: input.endAt,
          timeZone: "UTC"
        },
        attendees: input.attendees?.map((email) => ({ email })) || []
      };

      if (input.createMeetLink) {
        requestBody.conferenceData = {
          createRequest: {
            requestId: createSecretToken(16),
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        };
      }

      try {
        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody,
          conferenceDataVersion: input.createMeetLink ? 1 : 0
        });

        const event = response.data;

        // Save event metadata to DB
        if (prisma.googleCalendarEvent) {
          await prisma.googleCalendarEvent.create({
            data: {
              accountId: account.id,
              calendarEventId: event.id || "",
              summary: event.summary || "",
              description: event.description || "",
              startAt: new Date(input.startAt),
              endAt: new Date(input.endAt),
              hangoutLink: event.hangoutLink || null
            }
          });
        }

        return event;
      } catch (error) {
        serviceLogger.error({ error }, "Erro a criar evento no Google Calendar");
        throw new AppError("Não foi possível criar o evento no calendário.", {
          statusCode: 502,
          details: error instanceof Error ? error.message : error
        });
      }
    },

    async listEvents(sessionToken: string | null, limit: number): Promise<calendar_v3.Schema$Event[]> {
      const account = await resolveSession(sessionToken);
      const refreshToken = decryptSecret(account.refreshTokenEncrypted);

      const auth = createOAuthClient();
      auth.setCredentials({ refresh_token: refreshToken });
      const calendar = google.calendar({ version: "v3", auth });

      try {
        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: new Date().toISOString(),
          maxResults: limit,
          singleEvents: true,
          orderBy: "startTime"
        });

        return response.data.items || [];
      } catch (error) {
        serviceLogger.error({ error }, "Erro a listar eventos do Google Calendar");
        throw new AppError("Não foi possível carregar a lista de eventos.", {
          statusCode: 502
        });
      }
    }
  };
}
