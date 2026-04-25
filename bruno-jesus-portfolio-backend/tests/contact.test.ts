import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailService } from "../src/services/email.service";
import type { PrismaClientLike } from "../src/services/contact.service";

function setTestEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.PORT = "3333";
  process.env.HOST = "127.0.0.1";
  process.env.TRUST_PROXY = "false";
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/bruno_portfolio_db?schema=public";
  process.env.FRONTEND_URL = "http://localhost:3333";
  process.env.RESEND_API_KEY = "replace_with_resend_api_key";
  process.env.CONTACT_RECEIVER_EMAIL = "bruno@example.com";
  process.env.CONTACT_FROM_EMAIL = "Portfolio Contact <onboarding@resend.dev>";
  process.env.RATE_LIMIT_CONTACT_MAX = "5";
  process.env.RATE_LIMIT_CONTACT_WINDOW_MINUTES = "10";
  process.env.RATE_LIMIT_GLOBAL_MAX = "100";
  process.env.RATE_LIMIT_GLOBAL_WINDOW_MINUTES = "15";
}

async function createTestApp(overrides?: {
  prisma?: PrismaClientLike;
  emailService?: EmailService;
}): Promise<{
  app: FastifyInstance;
  prisma: PrismaClientLike;
  emailService: EmailService;
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
    logger: false
  });

  return {
    app,
    prisma,
    emailService
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
      message: "Validation error."
    });
    expect(response.json().errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "email",
          message: "Invalid email address."
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
      message: "Validation error."
    });
    expect(response.json().errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "message",
          message: "Message must be at least 10 characters."
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
      message: "Message received successfully.",
      data: {
        id: "contact_message_id"
      }
    });

    expect(testContext.prisma.contactMessage.create).toHaveBeenCalledTimes(1);
    expect(testContext.emailService.sendPortfolioNotification).toHaveBeenCalledTimes(1);
    expect(testContext.emailService.sendVisitorConfirmation).toHaveBeenCalledTimes(1);
  });
});
