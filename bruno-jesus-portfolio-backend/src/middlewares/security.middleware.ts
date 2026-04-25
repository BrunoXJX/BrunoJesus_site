import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

import { env, getAllowedCorsOrigins } from "../config/env";

export async function registerSecurityMiddleware(app: FastifyInstance): Promise<void> {
  const allowedOrigins = new Set(getAllowedCorsOrigins());

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://framerusercontent.com",
          "https://www.deloitte.com",
          "https://ipv.pt"
        ],
        connectSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://api.fontshare.com",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://cdn.fontshare.com",
          "https://fonts.gstatic.com",
          "data:"
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: `${env.RATE_LIMIT_GLOBAL_WINDOW_MINUTES} minutes`,
    errorResponseBuilder: () => ({
      success: false,
      message: "Too many requests. Please try again later."
    })
  });
}
