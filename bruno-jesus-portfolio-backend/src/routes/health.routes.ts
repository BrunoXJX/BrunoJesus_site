import type { FastifyPluginAsync } from "fastify";

import { SERVICE_NAME } from "../config/env";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  }));
};
