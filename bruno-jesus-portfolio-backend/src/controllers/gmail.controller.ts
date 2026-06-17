import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodSchema } from "zod";

import {
  gmailAuthCallbackQuerySchema,
  gmailMessageIdSchema,
  gmailMessagesQuerySchema,
  gmailReplyBodySchema,
  type GmailAuthCallbackQuery,
  type GmailMessagesQuery,
  type GmailReplyBody
} from "../schemas/gmail.schema";
import type { GmailAutomationService } from "../services/gmail.service";
import { AppError } from "../utils/AppError";
import { isProduction } from "../config/env";

const LAB_SESSION_COOKIE = "bj_lab_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface GmailControllerDependencies {
  gmailService: GmailAutomationService;
}

function parseOrThrow<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("Erro de validacao.", {
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

  if (!rawCookie) {
    return null;
  }

  const unsigned = request.unsignCookie(rawCookie);
  return unsigned.valid ? unsigned.value : null;
}

function setSessionCookie(reply: FastifyReply, sessionToken: string): void {
  reply.setCookie(LAB_SESSION_COOKIE, sessionToken, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    signed: true,
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(LAB_SESSION_COOKIE, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax"
  });
}

export function createGmailController({ gmailService }: GmailControllerDependencies) {
  return {
    async startAuth(_request: FastifyRequest, reply: FastifyReply) {
      const authUrl = await gmailService.createAuthUrl();

      return reply.send({
        success: true,
        data: { authUrl }
      });
    },

    async handleAuthCallback(
      request: FastifyRequest<{ Querystring: GmailAuthCallbackQuery }>,
      reply: FastifyReply
    ) {
      try {
        const query = parseOrThrow(gmailAuthCallbackQuerySchema, request.query);
        const result = await gmailService.completeOAuthCallback(query.code, query.state);
        setSessionCookie(reply, result.sessionToken);
        return reply.redirect("/lab.html?gmail=connected", 302);
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : "unknown"
          },
          "Gmail OAuth callback failed"
        );
        return reply.redirect("/lab.html?gmail=error", 302);
      }
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      await gmailService.clearSession(getSessionToken(request));
      clearSessionCookie(reply);

      return reply.send({
        success: true
      });
    },

    async status(request: FastifyRequest, reply: FastifyReply) {
      const status = await gmailService.getStatus(getSessionToken(request));

      return reply.send({
        success: true,
        data: status
      });
    },

    async listMessages(request: FastifyRequest<{ Querystring: GmailMessagesQuery }>, reply: FastifyReply) {
      const query = parseOrThrow(gmailMessagesQuerySchema, request.query);
      const messages = await gmailService.listMessages(getSessionToken(request), query.limit ?? 10);

      return reply.send({
        success: true,
        data: { messages }
      });
    },

    async getMessage(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
      const messageId = parseOrThrow(gmailMessageIdSchema, request.params.id);
      const message = await gmailService.getMessage(getSessionToken(request), messageId);

      return reply.send({
        success: true,
        data: { message }
      });
    },

    async suggestions(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
      const messageId = parseOrThrow(gmailMessageIdSchema, request.params.id);
      const suggestions = await gmailService.generateSuggestions(getSessionToken(request), messageId);

      return reply.send({
        success: true,
        data: suggestions
      });
    },

    async reply(
      request: FastifyRequest<{ Params: { id: string }; Body: GmailReplyBody }>,
      reply: FastifyReply
    ) {
      const messageId = parseOrThrow(gmailMessageIdSchema, request.params.id);
      const body = parseOrThrow(gmailReplyBodySchema, request.body);
      const result = await gmailService.sendReply(getSessionToken(request), messageId, body.message);

      return reply.send({
        success: true,
        message: "Resposta enviada pelo Gmail.",
        data: result
      });
    }
  };
}
