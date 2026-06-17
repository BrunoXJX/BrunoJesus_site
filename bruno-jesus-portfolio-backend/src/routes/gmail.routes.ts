import type { FastifyInstance } from "fastify";

import { createGmailController } from "../controllers/gmail.controller";
import type { GmailAutomationService } from "../services/gmail.service";

interface GmailRouteOptions {
  gmailService: GmailAutomationService;
}

export async function gmailRoutes(app: FastifyInstance, options: GmailRouteOptions) {
  const controller = createGmailController({
    gmailService: options.gmailService
  });

  app.get("/gmail/auth/start", controller.startAuth);
  app.get("/gmail/auth/callback", controller.handleAuthCallback);
  app.post("/gmail/auth/logout", controller.logout);
  app.get("/gmail/status", controller.status);
  app.get("/gmail/messages", controller.listMessages);
  app.get("/gmail/messages/:id", controller.getMessage);
  app.post("/gmail/messages/:id/suggestions", controller.suggestions);
  app.post("/gmail/messages/:id/reply", controller.reply);
}
