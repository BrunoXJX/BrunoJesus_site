import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

import { env, getAllowedCorsOrigins, isProduction } from "../config/env";

export async function registerSecurityMiddleware(app: FastifyInstance): Promise<void> {
  const allowedOrigins = new Set(getAllowedCorsOrigins());

  app.addHook("onRequest", async (_request, reply) => {
    reply.header(
      "Permissions-Policy",
      "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()"
    );
    reply.header("X-Permitted-Cross-Domain-Policies", "none");
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        childSrc: ["'none'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        scriptSrc: ["'self'", "https://unpkg.com"],
        styleSrc: ["'self'", "https://api.fontshare.com", "https://fonts.googleapis.com"],
        styleSrcAttr: ["'none'"],
        fontSrc: [
          "'self'",
          "https://cdn.fontshare.com",
          "https://fonts.gstatic.com",
          "data:"
        ],
        manifestSrc: ["'self'"],
        mediaSrc: ["'none'"],
        workerSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null
      }
    },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "no-referrer" },
    strictTransportSecurity: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        }
      : false
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (!isProduction && origin === "null") {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
    strictPreflight: true,
    maxAge: 86400
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: `${env.RATE_LIMIT_GLOBAL_WINDOW_MINUTES} minutes`,
    errorResponseBuilder: () => ({
      success: false,
      message: "Demasiados pedidos. Tenta novamente mais tarde."
    })
  });
}
