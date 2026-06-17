import type { FastifyBaseLogger } from "fastify";
import { gmail_v1, google } from "googleapis";
import OpenAI from "openai";
import { z } from "zod";

import { env, getAllowedLabEmails, getGoogleRedirectUri } from "../config/env";
import { AppError } from "../utils/AppError";
import {
  createSecretToken,
  decryptSecret,
  encodeBase64Url,
  encryptSecret,
  hashSecret
} from "../utils/labCrypto";

const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send"
];

const SESSION_TTL_DAYS = 30;
const OAUTH_STATE_TTL_MINUTES = 10;
const GMAIL_INBOX_QUERY = "in:inbox newer_than:14d -from:me";

const aiResponseSchema = z.object({
  summary: z.string().min(1).max(1200),
  intent: z.string().min(1).max(200),
  priority: z.enum(["baixa", "normal", "alta"]),
  suggestions: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        tone: z.string().min(1).max(80),
        body: z.string().min(1).max(4000)
      })
    )
    .min(1)
    .max(3)
});

export interface GmailAccountRecord {
  id: string;
  googleUserId: string;
  email: string;
  displayName: string | null;
  refreshTokenEncrypted: string;
  tokenScope: string | null;
  tokenExpiry: Date | null;
}

interface GmailOAuthStateRepository {
  create(args: { data: { stateHash: string; expiresAt: Date } }): Promise<unknown>;
  findUnique(args: { where: { stateHash: string } }): Promise<{ stateHash: string; expiresAt: Date } | null>;
  deleteMany(args: { where: { stateHash?: string; expiresAt?: { lt: Date } } }): Promise<unknown>;
}

interface GmailAccountRepository {
  findUnique(args: {
    where: { id?: string; googleUserId?: string; email?: string };
  }): Promise<GmailAccountRecord | null>;
  create(args: {
    data: {
      googleUserId: string;
      email: string;
      displayName: string | null;
      refreshTokenEncrypted: string;
      tokenScope: string | null;
      tokenExpiry: Date | null;
    };
  }): Promise<GmailAccountRecord>;
  update(args: {
    where: { id: string };
    data: Partial<{
      email: string;
      displayName: string | null;
      refreshTokenEncrypted: string;
      tokenScope: string | null;
      tokenExpiry: Date | null;
      lastSyncAt: Date | null;
    }>;
  }): Promise<GmailAccountRecord>;
}

interface GmailLabSessionRepository {
  create(args: {
    data: {
      sessionTokenHash: string;
      accountId: string;
      expiresAt: Date;
    };
  }): Promise<{ id: string }>;
  findUnique(args: {
    where: { sessionTokenHash: string };
    include: { account: true };
  }): Promise<{
    id: string;
    sessionTokenHash: string;
    accountId: string;
    expiresAt: Date;
    account: GmailAccountRecord;
  } | null>;
  update(args: { where: { id: string }; data: { lastSeenAt: Date } }): Promise<unknown>;
  deleteMany(args: { where: { sessionTokenHash?: string; expiresAt?: { lt: Date } } }): Promise<unknown>;
}

interface GmailAutomationLogRepository {
  create(args: {
    data: {
      accountId: string;
      action: "SUGGESTIONS_GENERATED" | "REPLY_SENT" | "SESSION_CREATED" | "SESSION_REVOKED";
      status: "SUCCESS" | "FAILURE";
      gmailMessageId?: string | null;
      gmailThreadId?: string | null;
      metadata?: Record<string, unknown>;
    };
  }): Promise<unknown>;
}

export interface GmailPrismaClient {
  gmailOAuthState?: GmailOAuthStateRepository;
  gmailAccount?: GmailAccountRepository;
  gmailLabSession?: GmailLabSessionRepository;
  gmailAutomationLog?: GmailAutomationLogRepository;
}

export interface GmailListMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string | null;
  snippet: string;
  unread: boolean;
}

export interface GmailMessageDetail extends GmailListMessage {
  to: string;
  messageId: string | null;
  references: string | null;
  inReplyTo: string | null;
  bodyText: string;
}

export interface GmailSuggestions {
  summary: string;
  intent: string;
  priority: "baixa" | "normal" | "alta";
  suggestions: Array<{
    id: string;
    tone: string;
    body: string;
  }>;
}

export interface GmailReplyResult {
  id: string;
  threadId: string;
}

interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
}

interface GoogleTokenResult {
  refreshToken: string | null;
  scope: string | null;
  expiryDate: Date | null;
  profile: GoogleProfile;
}

interface GoogleGmailProvider {
  createAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<GoogleTokenResult>;
  listMessages(refreshToken: string, limit: number): Promise<GmailListMessage[]>;
  getMessage(refreshToken: string, messageId: string): Promise<GmailMessageDetail>;
  sendReply(
    refreshToken: string,
    accountEmail: string,
    originalMessage: GmailMessageDetail,
    replyBody: string
  ): Promise<GmailReplyResult>;
}

interface GmailAiProvider {
  generateSuggestions(message: GmailMessageDetail): Promise<GmailSuggestions>;
}

export interface GmailStatus {
  connected: boolean;
  email: string | null;
  displayName: string | null;
}

export interface GmailAutomationService {
  createAuthUrl(): Promise<string>;
  completeOAuthCallback(code: string, state: string): Promise<{ sessionToken: string; account: GmailStatus }>;
  clearSession(sessionToken: string | null): Promise<void>;
  getStatus(sessionToken: string | null): Promise<GmailStatus>;
  listMessages(sessionToken: string | null, limit: number): Promise<GmailListMessage[]>;
  getMessage(sessionToken: string | null, messageId: string): Promise<GmailMessageDetail>;
  generateSuggestions(sessionToken: string | null, messageId: string): Promise<GmailSuggestions>;
  sendReply(sessionToken: string | null, messageId: string, replyBody: string): Promise<GmailReplyResult>;
}

interface GmailAutomationServiceDependencies {
  prisma: GmailPrismaClient;
  logger: FastifyBaseLogger;
  googleProvider?: GoogleGmailProvider;
  aiProvider?: GmailAiProvider;
}

function getGmailRepositories(prisma: GmailPrismaClient): Required<GmailPrismaClient> {
  if (
    !prisma.gmailOAuthState ||
    !prisma.gmailAccount ||
    !prisma.gmailLabSession ||
    !prisma.gmailAutomationLog
  ) {
    throw new AppError("Armazenamento do Gmail Lab nao esta configurado.", { statusCode: 503 });
  }

  return {
    gmailOAuthState: prisma.gmailOAuthState,
    gmailAccount: prisma.gmailAccount,
    gmailLabSession: prisma.gmailLabSession,
    gmailAutomationLog: prisma.gmailAutomationLog
  };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

function requireGmailConfig(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError("Google OAuth ainda nao esta configurado.", { statusCode: 503 });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertAllowedEmail(email: string): void {
  const allowedEmails = getAllowedLabEmails();

  if (!allowedEmails.includes(normalizeEmail(email))) {
    throw new AppError("Esta conta Gmail nao esta autorizada neste laboratorio.", { statusCode: 403 });
  }
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | null {
  const found = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeGmailBody(data: string | null | undefined): string {
  if (!data) {
    return "";
  }

  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function extractBodyText(payload: gmail_v1.Schema$MessagePart | undefined): string {
  const plainParts: string[] = [];
  const htmlParts: string[] = [];

  function visit(part: gmail_v1.Schema$MessagePart | undefined): void {
    if (!part) {
      return;
    }

    const body = decodeGmailBody(part.body?.data);

    if (body && part.mimeType === "text/plain") {
      plainParts.push(body);
    } else if (body && part.mimeType === "text/html") {
      htmlParts.push(stripHtml(body));
    }

    part.parts?.forEach((childPart) => visit(childPart));
  }

  visit(payload);

  return (plainParts.join("\n\n") || htmlParts.join("\n\n")).replace(/\n{3,}/gu, "\n\n").trim();
}

function normalizeDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/gu, " ").trim();
}

function encodeMimeHeader(value: string): string {
  const sanitized = sanitizeHeader(value);
  return /[^\x20-\x7E]/u.test(sanitized)
    ? `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`
    : sanitized;
}

function ensureReplySubject(subject: string): string {
  return /^re:/iu.test(subject) ? subject : `Re: ${subject || "(sem assunto)"}`;
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>@\s]+@[^<>\s]+)>/u);
  return match?.[1] ?? value.trim();
}

function buildReplyMime(accountEmail: string, originalMessage: GmailMessageDetail, replyBody: string): string {
  const to = extractEmailAddress(originalMessage.from);
  const subject = ensureReplySubject(originalMessage.subject);
  const headers = [
    `From: ${accountEmail}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit"
  ];

  if (originalMessage.messageId) {
    headers.push(`In-Reply-To: ${sanitizeHeader(originalMessage.messageId)}`);
    headers.push(
      `References: ${sanitizeHeader([originalMessage.references, originalMessage.messageId].filter(Boolean).join(" "))}`
    );
  }

  return `${headers.join("\r\n")}\r\n\r\n${replyBody.trim()}`;
}

function toGmailMessageDetail(message: gmail_v1.Schema$Message): GmailMessageDetail {
  const headers = message.payload?.headers ?? [];
  const subject = getHeader(headers, "Subject") ?? "(sem assunto)";
  const from = getHeader(headers, "From") ?? "Remetente desconhecido";
  const to = getHeader(headers, "To") ?? "";

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    from,
    to,
    subject,
    date: normalizeDate(getHeader(headers, "Date")),
    snippet: message.snippet ?? "",
    unread: message.labelIds?.includes("UNREAD") ?? false,
    messageId: getHeader(headers, "Message-ID"),
    references: getHeader(headers, "References"),
    inReplyTo: getHeader(headers, "In-Reply-To"),
    bodyText: extractBodyText(message.payload)
  };
}

class GoogleApisGmailProvider implements GoogleGmailProvider {
  private createOAuthClient() {
    return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, getGoogleRedirectUri());
  }

  createAuthUrl(state: string): string {
    requireGmailConfig();

    return this.createOAuthClient().generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: GMAIL_SCOPES,
      state
    });
  }

  async exchangeCode(code: string): Promise<GoogleTokenResult> {
    requireGmailConfig();

    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new AppError("Google nao devolveu identidade da conta.", { statusCode: 502 });
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new AppError("Identidade Google incompleta.", { statusCode: 502 });
    }

    return {
      refreshToken: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      profile: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name ?? null
      }
    };
  }

  async listMessages(refreshToken: string, limit: number): Promise<GmailListMessage[]> {
    const gmail = this.createGmailClient(refreshToken);
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: limit,
      q: GMAIL_INBOX_QUERY
    });

    const messages = listResponse.data.messages ?? [];

    return Promise.all(
      messages.map(async (message) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: message.id ?? "",
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date", "Message-ID", "References", "In-Reply-To"]
        });

        const parsed = toGmailMessageDetail(detail.data);

        return {
          id: parsed.id,
          threadId: parsed.threadId,
          from: parsed.from,
          subject: parsed.subject,
          date: parsed.date,
          snippet: parsed.snippet,
          unread: parsed.unread
        };
      })
    );
  }

  async getMessage(refreshToken: string, messageId: string): Promise<GmailMessageDetail> {
    const gmail = this.createGmailClient(refreshToken);
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full"
    });

    return toGmailMessageDetail(response.data);
  }

  async sendReply(
    refreshToken: string,
    accountEmail: string,
    originalMessage: GmailMessageDetail,
    replyBody: string
  ): Promise<GmailReplyResult> {
    const gmail = this.createGmailClient(refreshToken);
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodeBase64Url(buildReplyMime(accountEmail, originalMessage, replyBody)),
        threadId: originalMessage.threadId
      }
    });

    return {
      id: response.data.id ?? "",
      threadId: response.data.threadId ?? originalMessage.threadId
    };
  }

  private createGmailClient(refreshToken: string): gmail_v1.Gmail {
    const auth = this.createOAuthClient();
    auth.setCredentials({ refresh_token: refreshToken });
    return google.gmail({ version: "v1", auth });
  }
}

class OpenAiGmailProvider implements GmailAiProvider {
  async generateSuggestions(message: GmailMessageDetail): Promise<GmailSuggestions> {
    if (!env.OPENAI_API_KEY) {
      throw new AppError("OPENAI_API_KEY ainda nao esta configurada.", { statusCode: 503 });
    }

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      store: false,
      input: [
        {
          role: "system",
          content:
            "Resume emails e cria respostas em portugues europeu. Nao inventes factos. Devolve apenas JSON valido."
        },
        {
          role: "user",
          content: JSON.stringify({
            from: message.from,
            subject: message.subject,
            date: message.date,
            snippet: message.snippet,
            body: message.bodyText.slice(0, 12000)
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gmail_reply_suggestions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "intent", "priority", "suggestions"],
            properties: {
              summary: { type: "string" },
              intent: { type: "string" },
              priority: { type: "string", enum: ["baixa", "normal", "alta"] },
              suggestions: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "tone", "body"],
                  properties: {
                    id: { type: "string" },
                    tone: { type: "string" },
                    body: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    });

    const parsed = aiResponseSchema.safeParse(JSON.parse(response.output_text));

    if (!parsed.success) {
      throw new AppError("A IA devolveu uma resposta invalida.", {
        statusCode: 502,
        details: parsed.error.flatten()
      });
    }

    return parsed.data;
  }
}

export function createGmailAutomationService({
  prisma,
  logger,
  googleProvider = new GoogleApisGmailProvider(),
  aiProvider = new OpenAiGmailProvider()
}: GmailAutomationServiceDependencies): GmailAutomationService {
  const serviceLogger = logger.child({ service: "gmail-lab" });

  async function resolveSession(sessionToken: string | null): Promise<GmailAccountRecord> {
    if (!sessionToken) {
      throw new AppError("Liga o Gmail para continuar.", { statusCode: 401 });
    }

    const repositories = getGmailRepositories(prisma);
    const session = await repositories.gmailLabSession.findUnique({
      where: { sessionTokenHash: hashSecret(sessionToken) },
      include: { account: true }
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new AppError("Sessao do Gmail expirada.", { statusCode: 401 });
    }

    await repositories.gmailLabSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });

    return session.account;
  }

  async function getRefreshToken(account: GmailAccountRecord): Promise<string> {
    return decryptSecret(account.refreshTokenEncrypted);
  }

  async function logAction(
    accountId: string,
    action: "SUGGESTIONS_GENERATED" | "REPLY_SENT" | "SESSION_CREATED" | "SESSION_REVOKED",
    status: "SUCCESS" | "FAILURE",
    message?: { id?: string | null; threadId?: string | null },
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const repositories = getGmailRepositories(prisma);
      await repositories.gmailAutomationLog.create({
        data: {
          accountId,
          action,
          status,
          gmailMessageId: message?.id ?? null,
          gmailThreadId: message?.threadId ?? null,
          metadata
        }
      });
    } catch (error) {
      serviceLogger.warn(
        {
          accountId,
          action,
          status,
          error: error instanceof Error ? error.message : "unknown"
        },
        "Failed to write Gmail action log"
      );
    }
  }

  return {
    async createAuthUrl(): Promise<string> {
      const repositories = getGmailRepositories(prisma);
      const state = createSecretToken(32);
      const now = new Date();

      await repositories.gmailOAuthState.deleteMany({ where: { expiresAt: { lt: now } } });
      await repositories.gmailOAuthState.create({
        data: {
          stateHash: hashSecret(state),
          expiresAt: addMinutes(now, OAUTH_STATE_TTL_MINUTES)
        }
      });

      return googleProvider.createAuthUrl(state);
    },

    async completeOAuthCallback(code: string, state: string): Promise<{ sessionToken: string; account: GmailStatus }> {
      const repositories = getGmailRepositories(prisma);
      const stateHash = hashSecret(state);
      const savedState = await repositories.gmailOAuthState.findUnique({ where: { stateHash } });

      await repositories.gmailOAuthState.deleteMany({ where: { stateHash } });

      if (!savedState || savedState.expiresAt <= new Date()) {
        throw new AppError("Estado OAuth invalido ou expirado.", { statusCode: 400 });
      }

      const tokenResult = await googleProvider.exchangeCode(code);
      const email = normalizeEmail(tokenResult.profile.email);
      assertAllowedEmail(email);

      const existingAccount = await repositories.gmailAccount.findUnique({
        where: { googleUserId: tokenResult.profile.sub }
      });

      const refreshTokenEncrypted = tokenResult.refreshToken
        ? encryptSecret(tokenResult.refreshToken)
        : existingAccount?.refreshTokenEncrypted;

      if (!refreshTokenEncrypted) {
        throw new AppError("Google nao devolveu refresh token. Remove o acesso e tenta novamente.", {
          statusCode: 400
        });
      }

      const account = existingAccount
        ? await repositories.gmailAccount.update({
            where: { id: existingAccount.id },
            data: {
              email,
              displayName: tokenResult.profile.name,
              refreshTokenEncrypted,
              tokenScope: tokenResult.scope,
              tokenExpiry: tokenResult.expiryDate
            }
          })
        : await repositories.gmailAccount.create({
            data: {
              googleUserId: tokenResult.profile.sub,
              email,
              displayName: tokenResult.profile.name,
              refreshTokenEncrypted,
              tokenScope: tokenResult.scope,
              tokenExpiry: tokenResult.expiryDate
            }
          });

      const sessionToken = createSecretToken(32);
      await repositories.gmailLabSession.create({
        data: {
          sessionTokenHash: hashSecret(sessionToken),
          accountId: account.id,
          expiresAt: addDays(new Date(), SESSION_TTL_DAYS)
        }
      });
      await logAction(account.id, "SESSION_CREATED", "SUCCESS");

      return {
        sessionToken,
        account: {
          connected: true,
          email: account.email,
          displayName: account.displayName
        }
      };
    },

    async clearSession(sessionToken: string | null): Promise<void> {
      if (!sessionToken) {
        return;
      }

      const repositories = getGmailRepositories(prisma);
      const session = await repositories.gmailLabSession.findUnique({
        where: { sessionTokenHash: hashSecret(sessionToken) },
        include: { account: true }
      });
      await repositories.gmailLabSession.deleteMany({ where: { sessionTokenHash: hashSecret(sessionToken) } });

      if (session) {
        await logAction(session.accountId, "SESSION_REVOKED", "SUCCESS");
      }
    },

    async getStatus(sessionToken: string | null): Promise<GmailStatus> {
      if (!sessionToken) {
        return { connected: false, email: null, displayName: null };
      }

      try {
        const account = await resolveSession(sessionToken);
        return {
          connected: true,
          email: account.email,
          displayName: account.displayName
        };
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 401) {
          return { connected: false, email: null, displayName: null };
        }

        throw error;
      }
    },

    async listMessages(sessionToken: string | null, limit: number): Promise<GmailListMessage[]> {
      const account = await resolveSession(sessionToken);
      const repositories = getGmailRepositories(prisma);
      const messages = await googleProvider.listMessages(await getRefreshToken(account), limit);

      await repositories.gmailAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date() }
      });

      return messages;
    },

    async getMessage(sessionToken: string | null, messageId: string): Promise<GmailMessageDetail> {
      const account = await resolveSession(sessionToken);
      return googleProvider.getMessage(await getRefreshToken(account), messageId);
    },

    async generateSuggestions(sessionToken: string | null, messageId: string): Promise<GmailSuggestions> {
      const account = await resolveSession(sessionToken);
      const message = await googleProvider.getMessage(await getRefreshToken(account), messageId);

      try {
        const suggestions = await aiProvider.generateSuggestions(message);
        await logAction(account.id, "SUGGESTIONS_GENERATED", "SUCCESS", message, {
          priority: suggestions.priority
        });
        return suggestions;
      } catch (error) {
        await logAction(account.id, "SUGGESTIONS_GENERATED", "FAILURE", message);
        throw error;
      }
    },

    async sendReply(sessionToken: string | null, messageId: string, replyBody: string): Promise<GmailReplyResult> {
      const account = await resolveSession(sessionToken);
      const refreshToken = await getRefreshToken(account);
      const message = await googleProvider.getMessage(refreshToken, messageId);

      try {
        const result = await googleProvider.sendReply(refreshToken, account.email, message, replyBody);
        await logAction(account.id, "REPLY_SENT", "SUCCESS", message);
        return result;
      } catch (error) {
        await logAction(account.id, "REPLY_SENT", "FAILURE", message);
        throw error;
      }
    }
  };
}
