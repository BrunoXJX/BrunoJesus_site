import type { FastifyBaseLogger } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

function setCalendarTestEnv(openAiKey = ""): void {
  process.env.NODE_ENV = "test";
  process.env.PORT = "3333";
  process.env.HOST = "127.0.0.1";
  process.env.TRUST_PROXY = "false";
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/bruno_portfolio_db?schema=public";
  process.env.FRONTEND_URL = "http://localhost:3333";
  process.env.CORS_ORIGINS = "";
  process.env.RESEND_API_KEY = "replace_with_resend_api_key";
  process.env.CONTACT_RECEIVER_EMAIL = "bruno@example.com";
  process.env.CONTACT_FROM_EMAIL = "Portfolio Contact <onboarding@resend.dev>";
  process.env.REQUEST_BODY_LIMIT_BYTES = "65536";
  process.env.EMAIL_TIMEOUT_MS = "5000";
  process.env.RATE_LIMIT_CONTACT_MAX = "5";
  process.env.RATE_LIMIT_CONTACT_WINDOW_MINUTES = "10";
  process.env.RATE_LIMIT_GLOBAL_MAX = "100";
  process.env.RATE_LIMIT_GLOBAL_WINDOW_MINUTES = "15";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3333/api/gmail/auth/callback";
  process.env.LAB_ALLOWED_EMAILS = "bruno@example.com";
  process.env.LAB_SESSION_SECRET = "test_lab_session_secret_with_32_chars";
  process.env.TOKEN_ENCRYPTION_KEY = "test_token_encryption_key_with_32_chars";
  process.env.OPENAI_API_KEY = openAiKey;
  process.env.OPENAI_MODEL = "gpt-5.5";
  process.env.OPENAI_TRANSCRIBE_MODEL = "whisper-1";
  process.env.OPENAI_WEB_SEARCH_ENABLED = "false";
}

function createLoggerMock(): FastifyBaseLogger {
  return {
    child: () => ({ error: vi.fn(), warn: vi.fn() })
  } as unknown as FastifyBaseLogger;
}

async function loadCalendarModule(openAiKey = "") {
  setCalendarTestEnv(openAiKey);
  vi.resetModules();

  const audioCreate = vi.fn().mockResolvedValue({
    text: "Marca uma reuniao sobre design depois de amanha as 9 horas com a descricao rever bugs fortes"
  });
  const responsesCreate = vi.fn().mockResolvedValue({
    output_text: JSON.stringify({
      summary: "Design",
      description: "Rever bugs fortes",
      startAt: "2026-06-20T08:00:00.000Z",
      endAt: "2026-06-20T08:30:00.000Z",
      createMeetLink: true,
      confidence: "alta",
      notes: []
    })
  });
  const toFile = vi.fn(async () => ({ name: "voice-command.webm" }));
  const OpenAI = vi.fn().mockImplementation(() => ({
    audio: { transcriptions: { create: audioCreate } },
    responses: { create: responsesCreate }
  }));

  vi.doMock("openai", () => ({
    default: OpenAI,
    toFile
  }));

  const module = await import("../src/services/calendar.service");
  return { ...module, audioCreate, responsesCreate, toFile };
}

describe("Calendar Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock("openai");
  });

  it("should be defined with correct interface", async () => {
    const { createCalendarService } = await loadCalendarModule();
    const service = createCalendarService({ prisma: {}, logger: createLoggerMock() });

    expect(service).toBeDefined();
    expect(service.createEvent).toBeDefined();
    expect(service.listEvents).toBeDefined();
    expect(service.parseVoiceCommand).toBeDefined();
    expect(service.transcribeVoiceCommand).toBeDefined();
  });

  it("parses a Portuguese voice command for the day after tomorrow", async () => {
    const { parseVoiceCommandFallback } = await loadCalendarModule();
    const parsed = parseVoiceCommandFallback({
      transcript: "Marca uma reunião sobre design depois de amanhã às 9 horas com a descrição rever bugs fortes",
      now: "2026-06-18T10:00:00.000Z",
      timezone: "Europe/Lisbon"
    });

    expect(parsed.summary).toBe("Design");
    expect(parsed.description.toLowerCase()).toContain("rever bugs fortes");
    expect(parsed.startAt.startsWith("2026-06-20")).toBe(true);
    expect(new Date(parsed.endAt).getTime()).toBeGreaterThan(new Date(parsed.startAt).getTime());
  });

  it("requires OpenAI before transcribing browser audio", async () => {
    const { createCalendarService } = await loadCalendarModule("");
    const service = createCalendarService({ prisma: {}, logger: createLoggerMock() });

    await expect(
      service.transcribeVoiceCommand({
        audioBase64: Buffer.from("fake-audio").toString("base64"),
        mimeType: "audio/webm"
      })
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("rejects empty audio before calling OpenAI", async () => {
    const { createCalendarService, audioCreate } = await loadCalendarModule("sk-test");
    const service = createCalendarService({ prisma: {}, logger: createLoggerMock() });

    await expect(
      service.transcribeVoiceCommand({
        audioBase64: "AA==",
        mimeType: "audio/webm"
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(audioCreate).not.toHaveBeenCalled();
  });

  it("transcribes audio and returns the parsed calendar command", async () => {
    const { createCalendarService, audioCreate, responsesCreate, toFile } = await loadCalendarModule("sk-test");
    const service = createCalendarService({ prisma: {}, logger: createLoggerMock() });

    const result = await service.transcribeVoiceCommand({
      audioBase64: Buffer.alloc(256, 1).toString("base64"),
      mimeType: "audio/webm;codecs=opus",
      now: "2026-06-18T10:00:00.000Z",
      timezone: "Europe/Lisbon"
    });

    expect(result.transcript).toContain("design");
    expect(result.parsed.summary).toBe("Design");
    expect(audioCreate).toHaveBeenCalledWith(expect.objectContaining({ language: "pt", response_format: "text" }));
    expect(responsesCreate).toHaveBeenCalledOnce();
    expect(toFile).toHaveBeenCalledOnce();
  });
});
