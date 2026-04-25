import type { FastifyInstance } from "fastify";

import { isProduction } from "../config/env";
import { AppError } from "../utils/AppError";

export function registerErrorMiddleware(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const rawMessage = error instanceof Error ? error.message : "Unknown error.";
    const rawStatusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;

    const statusCode =
      error instanceof AppError
        ? error.statusCode
        : typeof rawStatusCode === "number" && rawStatusCode >= 400
          ? rawStatusCode
          : 500;

    const message =
      error instanceof AppError
        ? error.message
        : statusCode >= 500
          ? "Internal server error."
          : rawMessage;

    app.log.error(
      {
        method: request.method,
        path: request.url,
        statusCode,
        error: rawMessage
      },
      "Global error"
    );

    const response: Record<string, unknown> = {
      success: false,
      message
    };

    if (error instanceof AppError && Array.isArray(error.details)) {
      response.errors = error.details;
    } else if (!isProduction && error instanceof AppError && error.details) {
      response.details = error.details;
    } else if (!isProduction && statusCode >= 500) {
      response.details = rawMessage;
    }

    reply.status(statusCode).send(response);
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      message: "Route not found."
    });
  });
}
