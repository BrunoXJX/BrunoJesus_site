import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailService } from "../src/services/email.service";
import type { GmailAutomationService } from "../src/services/gmail.service";
import type { PrismaClientLike } from "../src/services/contact.service";

function setTestEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.PORT = "3333";
  process.env.HOST = "127.0.0.1";
  process.env.TRUST_PROXY = "false";
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/bruno_portfolio_db?schema=public";
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
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_MODEL = "gpt-5.5";
}

async function createTestApp(overrides?: {
  prisma?: PrismaClientLike;
  emailService?: EmailService;
  gmailService?: GmailAutomationService;
}): Promise<{
  app: FastifyInstance;
  prisma: PrismaClientLike;
  emailService: EmailService;
  gmailService?: GmailAutomationService;
}> {
  setTestEnv();
  vi.resetModules();

  const prisma =
    overrides?.prisma ??
    ({
      contactMessage: {
        create: vi.fn().mockResolvedValue({
          id: "contact_message_id",
          name: "Jane Builder",
          email: "jane@example.com",
          subject: "Project Collaboration",
          message: "This is a valid message sent from the test suite.",
          source: "portfolio",
          createdAt: new Date("2026-04-23T00:00:00.000Z"),
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
          status: "NEW"
        })
      }
    } as unknown as PrismaClientLike);

  const emailService =
    overrides?.emailService ??
    ({
      sendPortfolioNotification: vi.fn().mockResolvedValue(undefined),
      sendVisitorConfirmation: vi.fn().mockResolvedValue(undefined)
    } as EmailService);

  const { buildApp } = await import("../src/app");
  const app = await buildApp({
    prisma,
    emailService,
    gmailService: overrides?.gmailService,
    logger: false
  });

  return {
    app,
    prisma,
    emailService,
    gmailService: overrides?.gmailService
  };
}

describe("Portfolio API", () => {
  let app: FastifyInstance | undefined;

  beforeEach(() => {
    setTestEnv();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
    vi.clearAllMocks();
  });

  it("responds with status ok on GET /health", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "bruno-jesus-portfolio-backend"
    });
  });

  it("serves the portfolio on GET /", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "GET",
      url: "/"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("<!DOCTYPE html>");
    expect(response.body).toContain("Bruno Jesus");
  });

  it("rejects an invalid email on POST /api/contact", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        name: "Jane Builder",
        email: "invalid-email",
        subject: "Project Collaboration",
        message: "This is a valid message body for the validation test."
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      message: "Erro de validação."
    });
    expect(response.json().errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "email",
          message: "Endereço de email inválido."
        })
      ])
    );
  });

  it("rejects a short message on POST /api/contact", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        name: "Jane Builder",
        email: "jane@example.com",
        subject: "Project Collaboration",
        message: "Too short"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      message: "Erro de validação."
    });
    expect(response.json().errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "message",
          message: "A mensagem deve ter pelo menos 10 caracteres."
        })
      ])
    );
  });

  it("accepts a valid payload and stores the message", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        name: "Jane Builder",
        email: "jane@example.com",
        subject: "Project Collaboration",
        message: "I would like to talk about a new automation workflow for my company."
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      success: true,
      message: "Mensagem recebida com sucesso.",
      data: {
        id: "contact_message_id"
      }
    });

    expect(testContext.prisma.contactMessage.create).toHaveBeenCalledTimes(1);
    expect(testContext.emailService.sendPortfolioNotification).toHaveBeenCalledTimes(1);
    expect(testContext.emailService.sendVisitorConfirmation).toHaveBeenCalledTimes(1);
  });
  it("rejects a honeypot request silently with 200 OK", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        name: "Jane Builder",
        email: "jane@example.com",
        subject: "Project Collaboration",
        message: "This is a valid message.",
        website: "http://spam.com"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: false,
      message: "Pedido rejeitado."
    });
    expect(testContext.prisma.contactMessage.create).not.toHaveBeenCalled();
  });

  it("sanitizes XSS from the name field", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        name: "<script>alert(1)</script>Bruno",
        email: "jane@example.com",
        subject: "Project Collaboration",
        message: "I would like to talk about a new automation workflow for my company."
      }
    });

    expect(response.statusCode).toBe(201);
    expect(testContext.prisma.contactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Bruno"
        })
      })
    );
  });

  it("handles email service failures gracefully", async () => {
    const emailServiceMock = {
      sendPortfolioNotification: vi.fn().mockRejectedValue(new Error("Network Error")),
      sendVisitorConfirmation: vi.fn().mockResolvedValue(undefined)
    };

    const testContext = await createTestApp({ emailService: emailServiceMock as unknown as EmailService });
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        name: "Jane Builder",
        email: "jane@example.com",
        subject: "Project Collaboration",
        message: "I would like to talk about a new automation workflow for my company."
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      message: "Mensagem recebida com sucesso. A notificação por email falhou."
    });
  });

  it("rejects when required fields are missing", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it("rejects when the name field is missing", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        email: "jane@example.com",
        subject: "Project Collaboration",
        message: "I would like to talk about a new automation workflow for my company."
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it("rejects when the message contains too many URLs", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/contact",
      payload: {
        name: "Jane Builder",
        email: "jane@example.com",
        subject: "Project Collaboration",
        message: "Here are some links: http://a.com, http://b.com, http://c.com, http://d.com, http://e.com, http://f.com"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it("responds with API info on GET /api", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "GET",
      url: "/api"
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns a 404 for non-existent routes", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "GET",
      url: "/nonexistent"
    });

    expect(response.statusCode).toBe(404);
  });

  it("reports Gmail as disconnected without a lab session", async () => {
    const testContext = await createTestApp();
    app = testContext.app;

    const response = await app.inject({
      method: "GET",
      url: "/api/gmail/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: {
        connected: false,
        email: null,
        displayName: null
      }
    });
  });

  it("returns a Gmail OAuth URL from the lab auth endpoint", async () => {
    const gmailService = {
      createAuthUrl: vi.fn().mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?state=test"),
      completeOAuthCallback: vi.fn(),
      clearSession: vi.fn(),
      getStatus: vi.fn(),
      listMessages: vi.fn(),
      getMessage: vi.fn(),
      generateSuggestions: vi.fn(),
      sendReply: vi.fn()
    } as unknown as GmailAutomationService;
    const testContext = await createTestApp({ gmailService });
    app = testContext.app;

    const response = await app.inject({
      method: "GET",
      url: "/api/gmail/auth/start"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=test"
      }
    });
    expect(gmailService.createAuthUrl).toHaveBeenCalledTimes(1);
  });

  it("sets a signed lab session cookie after Gmail OAuth callback", async () => {
    const gmailService = {
      createAuthUrl: vi.fn(),
      completeOAuthCallback: vi.fn().mockResolvedValue({
        sessionToken: "session-token",
        account: {
          connected: true,
          email: "bruno@example.com",
          displayName: "Bruno"
        }
      }),
      clearSession: vi.fn(),
      getStatus: vi.fn(),
      listMessages: vi.fn(),
      getMessage: vi.fn(),
      generateSuggestions: vi.fn(),
      sendReply: vi.fn()
    } as unknown as GmailAutomationService;
    const testContext = await createTestApp({ gmailService });
    app = testContext.app;

    const response = await app.inject({
      method: "GET",
      url: "/api/gmail/auth/callback?code=oauth-code&state=1234567890123456"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/lab.html?gmail=connected");
    expect(response.headers["set-cookie"]).toContain("bj_lab_session=");
    expect(gmailService.completeOAuthCallback).toHaveBeenCalledWith("oauth-code", "1234567890123456");
  });

  it("returns Gmail AI suggestions from the lab endpoint", async () => {
    const gmailService = {
      createAuthUrl: vi.fn(),
      completeOAuthCallback: vi.fn(),
      clearSession: vi.fn(),
      getStatus: vi.fn(),
      listMessages: vi.fn(),
      getMessage: vi.fn(),
      generateSuggestions: vi.fn().mockResolvedValue({
        summary: "Pedido de reuniao sobre automacao.",
        intent: "Quer marcar uma chamada.",
        priority: "normal",
        suggestions: [
          { id: "direct", tone: "Direto", body: "Claro, podemos falar amanha." },
          { id: "warm", tone: "Proximo", body: "Obrigado pelo contacto. Tenho gosto em falar." },
          { id: "short", tone: "Curto", body: "Sim, envio disponibilidade." }
        ]
      }),
      sendReply: vi.fn()
    } as unknown as GmailAutomationService;
    const testContext = await createTestApp({ gmailService });
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/gmail/messages/msg_123/suggestions",
      payload: {}
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.suggestions).toHaveLength(3);
    expect(gmailService.generateSuggestions).toHaveBeenCalledWith(null, "msg_123");
  });

  it("sends a Gmail reply only through the explicit reply endpoint", async () => {
    const gmailService = {
      createAuthUrl: vi.fn(),
      completeOAuthCallback: vi.fn(),
      clearSession: vi.fn(),
      getStatus: vi.fn(),
      listMessages: vi.fn(),
      getMessage: vi.fn(),
      generateSuggestions: vi.fn(),
      sendReply: vi.fn().mockResolvedValue({
        id: "sent_msg",
        threadId: "thread_123"
      })
    } as unknown as GmailAutomationService;
    const testContext = await createTestApp({ gmailService });
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/gmail/messages/msg_123/reply",
      payload: {
        message: "Obrigado. Confirmo a reuniao.",
        suggestionId: "direct"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      message: "Resposta enviada pelo Gmail.",
      data: {
        id: "sent_msg",
        threadId: "thread_123"
      }
    });
    expect(gmailService.sendReply).toHaveBeenCalledWith(null, "msg_123", "Obrigado. Confirmo a reuniao.");
  });

  it("rejects unsafe Gmail message identifiers", async () => {
    const gmailService = {
      createAuthUrl: vi.fn(),
      completeOAuthCallback: vi.fn(),
      clearSession: vi.fn(),
      getStatus: vi.fn(),
      listMessages: vi.fn(),
      getMessage: vi.fn(),
      generateSuggestions: vi.fn(),
      sendReply: vi.fn()
    } as unknown as GmailAutomationService;
    const testContext = await createTestApp({ gmailService });
    app = testContext.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/gmail/messages/%3Cscript%3E/suggestions",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
    expect(gmailService.generateSuggestions).not.toHaveBeenCalled();
  });
});
