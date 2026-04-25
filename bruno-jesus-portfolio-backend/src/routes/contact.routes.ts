import type { FastifyPluginAsync, FastifyPluginOptions } from "fastify";

import { env } from "../config/env";
import { createContactController } from "../controllers/contact.controller";
import type { ContactService } from "../services/contact.service";

interface ContactRouteOptions extends FastifyPluginOptions {
  contactService: ContactService;
}

export const contactRoutes: FastifyPluginAsync<ContactRouteOptions> = async (app, options) => {
  const controller = createContactController(options.contactService);

  app.post(
    "/contact",
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_CONTACT_MAX,
          timeWindow: `${env.RATE_LIMIT_CONTACT_WINDOW_MINUTES} minutes`
        }
      }
    },
    controller.submitContact
  );
};
