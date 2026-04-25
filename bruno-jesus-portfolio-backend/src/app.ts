import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions
} from "fastify";

import { API_VERSION, env } from "./config/env";
import prisma from "./database/prisma";
import { registerErrorMiddleware } from "./middlewares/error.middleware";
import { registerSecurityMiddleware } from "./middlewares/security.middleware";
import { contactRoutes } from "./routes/contact.routes";
import { healthRoutes } from "./routes/health.routes";
import { createContactService, type PrismaClientLike } from "./services/contact.service";
import { createEmailService, type EmailService } from "./services/email.service";

export interface BuildAppOptions {
  prisma?: PrismaClientLike;
  emailService?: EmailService;
  logger?: FastifyServerOptions["logger"];
}

const publicRoot = path.resolve(__dirname, "..", "public");
const legacyFrontendRoutes = ["/sistema", "/competencias", "/percurso", "/projetos", "/contacto", "/portfolio.html"];

function createLoggerOptions(): FastifyServerOptions["logger"] {
  if (env.NODE_ENV === "test") {
    return false;
  }

  return {
    level: env.NODE_ENV === "development" ? "debug" : "info",
    transport:
      env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              ignore: "pid,hostname"
            }
          }
        : undefined
  };
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const prismaClient = options.prisma ?? prisma;

  const app = Fastify({
    logger: options.logger ?? createLoggerOptions(),
    bodyLimit: 64 * 1024,
    trustProxy: env.TRUST_PROXY
  });

  await registerSecurityMiddleware(app);
  registerErrorMiddleware(app);
  await app.register(fastifyStatic, {
    root: publicRoot,
    prefix: "/",
    index: false
  });

  const emailService = options.emailService ?? createEmailService(app.log);
  const contactService = createContactService({
    prisma: prismaClient,
    emailService,
    logger: app.log
  });

  app.get("/api", async () => ({
    message: "Bruno Jesus Portfolio API",
    status: "online",
    version: API_VERSION
  }));

  app.get("/", async (_request, reply) => reply.type("text/html; charset=utf-8").sendFile("index.html"));
  legacyFrontendRoutes.forEach((route) => {
    app.get(route, async (_request, reply) => reply.redirect("/", 302));
  });

  await app.register(healthRoutes);
  await app.register(contactRoutes, {
    prefix: "/api",
    contactService
  });

  app.addHook("onClose", async () => {
    if (!options.prisma && prismaClient.$disconnect) {
      await prismaClient.$disconnect();
    }
  });

  return app;
}
