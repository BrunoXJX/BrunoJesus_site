import type { FastifyBaseLogger } from "fastify";
import { calendar_v3, google } from "googleapis";
import OpenAI, { toFile } from "openai";
import { z } from "zod";

import { env, getGoogleRedirectUri } from "../config/env";
import type {
  CreateCalendarEventInput,
  ParsedVoiceCommand,
  TranscribedVoiceCommand,
  VoiceAudioInput,
  VoiceCommandInput
} from "../schemas/calendar.schema";
import { AppError } from "../utils/AppError";
import { createSecretToken, decryptSecret, hashSecret } from "../utils/labCrypto";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const DEFAULT_EVENT_MINUTES = 30;
const MAX_AUDIO_BYTES = 4_500_000;

const parsedVoiceCommandSchema = z.object({
  summary: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  createMeetLink: z.boolean().default(true),
  confidence: z.enum(["baixa", "media", "alta"]),
  notes: z.array(z.string().trim().max(200)).max(4).default([])
});

interface CalendarAccountRecord {
  id: string;
  refreshTokenEncrypted: string;
  tokenScope: string | null;
}

interface CalendarSessionRepository {
  findUnique(args: {
    where: { sessionTokenHash: string };
    include: { account: true };
  }): Promise<{
    id: string;
    expiresAt: Date;
    account: CalendarAccountRecord;
  } | null>;
}

interface GoogleCalendarEventRepository {
  create(args: {
    data: {
      accountId: string;
      calendarEventId: string;
      summary: string;
      description: string | null;
      startAt: Date;
      endAt: Date;
      hangoutLink: string | null;
    };
  }): Promise<unknown>;
}

export interface CalendarPrismaClient {
  gmailLabSession?: CalendarSessionRepository;
  googleCalendarEvent?: GoogleCalendarEventRepository;
}

export interface CalendarService {
  createEvent(sessionToken: string | null, input: CreateCalendarEventInput): Promise<calendar_v3.Schema$Event>;
  listEvents(sessionToken: string | null, limit: number): Promise<calendar_v3.Schema$Event[]>;
  parseVoiceCommand(input: VoiceCommandInput): Promise<ParsedVoiceCommand>;
  transcribeVoiceCommand(input: VoiceAudioInput): Promise<TranscribedVoiceCommand>;
}

interface CalendarServiceDependencies {
  prisma: CalendarPrismaClient;
  logger: FastifyBaseLogger;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function toIso(date: Date): string {
  return date.toISOString();
}

function cleanBase64Audio(value: string): string {
  const commaIndex = value.indexOf(",");
  return commaIndex === -1 ? value : value.slice(commaIndex + 1);
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() || "audio/webm";
}

function extractTranscriptText(response: { text?: string } | string): string {
  if (typeof response === "string") {
    return response.trim();
  }

  return (response.text ?? "").trim();
}

function extensionFromMimeType(mimeType: string): string {
  const normalized = normalizeMimeType(mimeType);
  switch (normalized) {
    case "audio/mp4":
    case "audio/m4a":
      return "m4a";
    case "audio/mpeg":
    case "audio/mp3":
      return "mp3";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
    case "audio/wave":
    case "audio/x-wav":
      return "wav";
    case "audio/webm":
    default:
      return "webm";
  }
}

function getNextWeekday(base: Date, targetDay: number): Date {
  const next = new Date(base);
  const currentDay = base.getDay();
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  next.setDate(base.getDate() + daysToAdd);
  return next;
}

function parseTimeIntoDate(text: string, targetDate: Date, now: Date): string[] {
  const notes: string[] = [];
  const timeMatch = text.match(
    /(?:as|a|pelas|para as)\s+(\d{1,2})(?:[:h](\d{2}))?(?:\s*(da\s+manha|da\s+tarde|da\s+noite|manhã|tarde|noite))?/u
  );

  if (!timeMatch) {
    targetDate.setHours(now.getHours() + 1, 0, 0, 0);
    notes.push("Nao encontrei hora explicita; usei a proxima hora cheia.");
    return notes;
  }

  let hours = Number.parseInt(timeMatch[1] ?? "0", 10);
  const minutes = timeMatch[2] ? Number.parseInt(timeMatch[2], 10) : 0;
  const period = normalizeText(timeMatch[3] ?? "");

  if ((period.includes("tarde") || period.includes("noite")) && hours < 12) {
    hours += 12;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    targetDate.setHours(now.getHours() + 1, 0, 0, 0);
    notes.push("A hora parecia invalida; usei a proxima hora cheia.");
    return notes;
  }

  targetDate.setHours(hours, minutes, 0, 0);
  return notes;
}

function extractBetween(text: string, markers: string[]): string | null {
  const lowerText = text.toLowerCase();
  const stopMarkers = [
    " depois de amanhã",
    " depois de amanha",
    " amanhã",
    " amanha",
    " hoje",
    " segunda",
    " terça",
    " terca",
    " quarta",
    " quinta",
    " sexta",
    " sábado",
    " sabado",
    " domingo",
    " às",
    " as",
    " pelas",
    " para as",
    " com a descrição",
    " com a descricao",
    " descrição",
    " descricao",
    " detalhes"
  ];

  for (const marker of markers) {
    const index = lowerText.indexOf(marker.toLowerCase());
    if (index === -1) {
      continue;
    }

    const rawValue = text.slice(index + marker.length);
    const rawValueLower = rawValue.toLowerCase();
    const endIndex = stopMarkers.reduce((currentEnd, stopMarker) => {
      const stopIndex = rawValueLower.indexOf(stopMarker);
      return stopIndex > 0 && stopIndex < currentEnd ? stopIndex : currentEnd;
    }, rawValue.length);

    const value = rawValue.slice(0, endIndex).replace(/[.,;]+$/u, "").trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function parseVoiceCommandFallback(input: VoiceCommandInput): ParsedVoiceCommand {
  const transcript = input.transcript.trim();
  const normalized = normalizeText(transcript);
  const now = input.now ? new Date(input.now) : new Date();
  const base = Number.isNaN(now.getTime()) ? new Date() : now;
  let targetDate = new Date(base);
  const notes: string[] = [];

  if (normalized.includes("depois de amanha")) {
    targetDate.setDate(base.getDate() + 2);
  } else if (normalized.includes("amanha")) {
    targetDate.setDate(base.getDate() + 1);
  } else if (normalized.includes("hoje")) {
    targetDate = new Date(base);
  } else {
    const weekdays: Array<[string, number]> = [
      ["domingo", 0],
      ["segunda", 1],
      ["terca", 2],
      ["terça", 2],
      ["quarta", 3],
      ["quinta", 4],
      ["sexta", 5],
      ["sabado", 6],
      ["sábado", 6]
    ];
    const weekday = weekdays.find(([name]) => normalized.includes(name));
    if (weekday) {
      targetDate = getNextWeekday(base, weekday[1]);
    } else {
      notes.push("Nao encontrei data explicita; usei hoje.");
    }
  }

  notes.push(...parseTimeIntoDate(normalized, targetDate, base));

  const title =
    extractBetween(transcript, [
      "reunião sobre",
      "reuniao sobre",
      "chamada sobre",
      "call sobre",
      "assunto",
      "tema",
      "título",
      "titulo"
    ]) ?? "Reuniao agendada por voz";
  const description =
    extractBetween(transcript, ["com a descrição", "com a descricao", "descrição", "descricao", "detalhes"]) ??
    transcript;
  const startAt = toIso(targetDate);
  const endAt = toIso(addMinutes(targetDate, DEFAULT_EVENT_MINUTES));

  return {
    summary: title.charAt(0).toUpperCase() + title.slice(1),
    description: description.charAt(0).toUpperCase() + description.slice(1),
    startAt,
    endAt,
    createMeetLink: true,
    confidence: notes.length > 0 ? "media" : "alta",
    notes
  };
}

export function createCalendarService({ prisma, logger }: CalendarServiceDependencies): CalendarService {
  const serviceLogger = logger.child({ service: "calendar-service" });

  async function resolveSession(sessionToken: string | null): Promise<CalendarAccountRecord> {
    if (!sessionToken) {
      throw new AppError("Liga a tua conta Google para continuar.", { statusCode: 401 });
    }

    if (!prisma.gmailLabSession) {
      throw new AppError("Armazenamento do laboratorio nao esta configurado.", { statusCode: 503 });
    }

    const session = await prisma.gmailLabSession.findUnique({
      where: { sessionTokenHash: hashSecret(sessionToken) },
      include: { account: true }
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new AppError("Sessao do laboratorio expirada.", { statusCode: 401 });
    }

    return session.account;
  }

  function assertCalendarScope(account: CalendarAccountRecord): void {
    const scopes = (account.tokenScope ?? "").split(/\s+/u);
    if (!scopes.includes("https://www.googleapis.com/auth/calendar.events")) {
      throw new AppError("Volta a ligar a conta Google para autorizar o Calendario.", { statusCode: 403 });
    }
  }

  function createOAuthClient() {
    return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, getGoogleRedirectUri());
  }

  async function saveEventMetadata(
    account: CalendarAccountRecord,
    event: calendar_v3.Schema$Event,
    input: CreateCalendarEventInput
  ): Promise<void> {
    if (!prisma.googleCalendarEvent || !event.id) {
      return;
    }

    try {
      await prisma.googleCalendarEvent.create({
        data: {
          accountId: account.id,
          calendarEventId: event.id,
          summary: event.summary || input.summary,
          description: event.description || null,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          hangoutLink: event.hangoutLink || null
        }
      });
    } catch (error) {
      serviceLogger.warn(
        {
          accountId: account.id,
          eventId: event.id,
          error: error instanceof Error ? error.message : "unknown"
        },
        "Failed to store Google Calendar event metadata"
      );
    }
  }

  async function parseVoiceCommand(input: VoiceCommandInput): Promise<ParsedVoiceCommand> {
    if (!env.OPENAI_API_KEY) {
      return parseVoiceCommandFallback(input);
    }

    const fallback = parseVoiceCommandFallback(input);
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    try {
      const response = await client.responses.create({
        model: env.OPENAI_MODEL,
        store: false,
        input: [
          {
            role: "system",
            content:
              "Interpreta comandos de voz em portugues europeu para criar eventos de calendario. " +
              "Assume timezone Europe/Lisbon quando faltar contexto. Nao inventes participantes. Devolve apenas JSON valido."
          },
          {
            role: "user",
            content: JSON.stringify({
              transcript: input.transcript,
              now: input.now ?? new Date().toISOString(),
              timezone: input.timezone ?? DEFAULT_TIMEZONE,
              fallback
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "calendar_voice_command",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["summary", "description", "startAt", "endAt", "createMeetLink", "confidence", "notes"],
              properties: {
                summary: { type: "string" },
                description: { type: "string" },
                startAt: { type: "string" },
                endAt: { type: "string" },
                createMeetLink: { type: "boolean" },
                confidence: { type: "string", enum: ["baixa", "media", "alta"] },
                notes: {
                  type: "array",
                  maxItems: 4,
                  items: { type: "string" }
                }
              }
            }
          }
        }
      });

      const parsed = parsedVoiceCommandSchema.safeParse(JSON.parse(response.output_text));
      if (!parsed.success || new Date(parsed.data.startAt) >= new Date(parsed.data.endAt)) {
        return fallback;
      }

      return parsed.data;
    } catch (error) {
      serviceLogger.warn(
        {
          error: error instanceof Error ? error.message : "unknown"
        },
        "Voice command AI parse failed; using fallback parser"
      );
      return fallback;
    }
  }

  async function transcribeVoiceCommand(input: VoiceAudioInput): Promise<TranscribedVoiceCommand> {
    if (!env.OPENAI_API_KEY) {
      throw new AppError("OPENAI_API_KEY e necessaria para transcrever audio.", { statusCode: 503 });
    }

    const audioBuffer = Buffer.from(cleanBase64Audio(input.audioBase64), "base64");
    if (audioBuffer.byteLength < 64) {
      throw new AppError("A gravacao de voz esta vazia.", { statusCode: 400 });
    }

    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      throw new AppError("A gravacao de voz e demasiado grande.", { statusCode: 413 });
    }

    const mimeType = normalizeMimeType(input.mimeType || "audio/webm");
    const extension = extensionFromMimeType(mimeType);
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    async function transcribeWithModel(model: string): Promise<string> {
      const response = await client.audio.transcriptions.create({
        file: await toFile(audioBuffer, `voice-command.${extension}`, { type: mimeType }),
        model,
        language: "pt",
        prompt: "Comando em portugues europeu para criar uma reuniao no calendario.",
        response_format: "text"
      });

      return extractTranscriptText(response);
    }

    try {
      let transcript: string;
      try {
        transcript = await transcribeWithModel(env.OPENAI_TRANSCRIBE_MODEL);
      } catch (error) {
        if (env.OPENAI_TRANSCRIBE_MODEL === "whisper-1") {
          throw error;
        }
        transcript = await transcribeWithModel("whisper-1");
      }

      if (transcript.length < 4) {
        throw new AppError("Nao consegui perceber audio suficiente. Tenta falar mais perto do microfone.", {
          statusCode: 422
        });
      }

      const parsed = await parseVoiceCommand({
        transcript,
        now: input.now,
        timezone: input.timezone
      });

      return { transcript, parsed };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      serviceLogger.warn(
        {
          error: error instanceof Error ? error.message : "unknown"
        },
        "Voice transcription failed"
      );
      throw new AppError("Nao foi possivel transcrever o audio. Tenta falar mais perto do microfone ou usa Chrome/Edge.", {
        statusCode: 502,
        details: error instanceof Error ? error.message : error
      });
    }
  }

  return {
    async createEvent(sessionToken: string | null, input: CreateCalendarEventInput): Promise<calendar_v3.Schema$Event> {
      const account = await resolveSession(sessionToken);
      assertCalendarScope(account);
      const auth = createOAuthClient();
      auth.setCredentials({ refresh_token: decryptSecret(account.refreshTokenEncrypted) });
      const calendar = google.calendar({ version: "v3", auth });

      const requestBody: calendar_v3.Schema$Event = {
        summary: input.summary,
        description: input.description || "",
        start: {
          dateTime: input.startAt,
          timeZone: DEFAULT_TIMEZONE
        },
        end: {
          dateTime: input.endAt,
          timeZone: DEFAULT_TIMEZONE
        },
        attendees: input.attendees?.map((email) => ({ email })) || []
      };

      if (input.createMeetLink !== false) {
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
          conferenceDataVersion: input.createMeetLink === false ? 0 : 1,
          requestBody
        });

        await saveEventMetadata(account, response.data, input);
        return response.data;
      } catch (error) {
        serviceLogger.error(
          {
            accountId: account.id,
            error: error instanceof Error ? error.message : "unknown"
          },
          "Failed to create Google Calendar event"
        );
        throw new AppError("Nao foi possivel criar o evento no calendario.", {
          statusCode: 502,
          details: error instanceof Error ? error.message : error
        });
      }
    },

    async listEvents(sessionToken: string | null, limit: number): Promise<calendar_v3.Schema$Event[]> {
      const account = await resolveSession(sessionToken);
      assertCalendarScope(account);
      const auth = createOAuthClient();
      auth.setCredentials({ refresh_token: decryptSecret(account.refreshTokenEncrypted) });
      const calendar = google.calendar({ version: "v3", auth });

      try {
        const response = await calendar.events.list({
          calendarId: "primary",
          maxResults: limit,
          orderBy: "startTime",
          singleEvents: true,
          timeMin: new Date().toISOString()
        });

        return response.data.items || [];
      } catch (error) {
        serviceLogger.error(
          {
            accountId: account.id,
            error: error instanceof Error ? error.message : "unknown"
          },
          "Failed to list Google Calendar events"
        );
        throw new AppError("Nao foi possivel carregar a lista de eventos.", { statusCode: 502 });
      }
    },

    async parseVoiceCommand(input: VoiceCommandInput): Promise<ParsedVoiceCommand> {
      return parseVoiceCommand(input);
    },

    async transcribeVoiceCommand(input: VoiceAudioInput): Promise<TranscribedVoiceCommand> {
      return transcribeVoiceCommand(input);
    }
  };
}
