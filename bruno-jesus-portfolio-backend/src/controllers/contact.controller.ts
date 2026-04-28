import type { FastifyReply, FastifyRequest } from "fastify";

import {
  contactRequestSchema,
  formatContactValidationErrors
} from "../schemas/contact.schema";
import type { ContactService } from "../services/contact.service";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

type ContactRequest = FastifyRequest<{
  Body: unknown;
}>;

function normalizeUserAgent(userAgent: string | string[] | undefined): string | null {
  if (Array.isArray(userAgent)) {
    return userAgent.join(" ");
  }

  return userAgent ?? null;
}

export function createContactController(contactService: ContactService) {
  return {
    submitContact: asyncHandler(async (request: ContactRequest, reply: FastifyReply) => {
      request.log.info(
        {
          route: "/api/contact",
          ipAddress: request.ip
        },
        "Contact request received"
      );

      const parsedBody = contactRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        throw new AppError("Erro de validação.", {
          statusCode: 400,
          code: "VALIDATION_ERROR",
          details: formatContactValidationErrors(parsedBody.error)
        });
      }

      if (parsedBody.data.website && parsedBody.data.website.length > 0) {
        request.log.warn(
          {
            route: "/api/contact",
            ipAddress: request.ip
          },
          "Contact honeypot triggered"
        );

        return reply.status(200).send({
          success: false,
          message: "Pedido rejeitado."
        });
      }

      const result = await contactService.submitMessage(
        {
          name: parsedBody.data.name,
          email: parsedBody.data.email,
          subject: parsedBody.data.subject,
          message: parsedBody.data.message
        },
        {
          source: "portfolio",
          ipAddress: request.ip,
          userAgent: normalizeUserAgent(request.headers["user-agent"])
        }
      );

      return reply.status(201).send({
        success: true,
        message: result.emailNotificationFailed
          ? "Mensagem recebida com sucesso. A notificação por email falhou."
          : "Mensagem recebida com sucesso.",
        data: {
          id: result.id
        }
      });
    })
  };
}
