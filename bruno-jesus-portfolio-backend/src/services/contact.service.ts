import type { FastifyBaseLogger } from "fastify";

import type {
  ContactCreateInput,
  ContactRequestContext,
  ContactSubmissionResult,
  PortfolioEmailPayload
} from "../types/contact.types";
import type { EmailService } from "./email.service";

interface ContactRecord extends Omit<PortfolioEmailPayload, "subject"> {
  subject: string | null;
}

interface ContactMessageRepository {
  create(args: {
    data: {
      name: string;
      email: string;
      subject: string;
      message: string;
      source: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    };
  }): Promise<ContactRecord>;
}

export interface PrismaClientLike {
  contactMessage: ContactMessageRepository;
  $disconnect?: () => Promise<void>;
}

export interface ContactService {
  submitMessage(
    payload: ContactCreateInput,
    context: ContactRequestContext
  ): Promise<ContactSubmissionResult>;
}

interface ContactServiceDependencies {
  prisma: PrismaClientLike;
  emailService: EmailService;
  logger: FastifyBaseLogger;
}

function getEmailDomain(email: string): string {
  return email.split("@")[1] ?? "unknown";
}

export function createContactService({
  prisma,
  emailService,
  logger
}: ContactServiceDependencies): ContactService {
  const serviceLogger = logger.child({ service: "contact" });

  return {
    async submitMessage(
      payload: ContactCreateInput,
      context: ContactRequestContext
    ): Promise<ContactSubmissionResult> {
      const source = context.source ?? "portfolio";

      const savedMessage = await prisma.contactMessage.create({
        data: {
          name: payload.name,
          email: payload.email,
          subject: payload.subject,
          message: payload.message,
          source,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null
        }
      });

      serviceLogger.info(
        {
          messageId: savedMessage.id,
          emailDomain: getEmailDomain(savedMessage.email)
        },
        "Message stored"
      );

      const emailPayload: PortfolioEmailPayload = {
        id: savedMessage.id,
        name: savedMessage.name,
        email: savedMessage.email,
        subject: savedMessage.subject ?? payload.subject,
        message: savedMessage.message,
        source: savedMessage.source,
        createdAt: savedMessage.createdAt,
        ipAddress: savedMessage.ipAddress ?? null,
        userAgent: savedMessage.userAgent ?? null
      };

      const results = await Promise.allSettled([
        emailService.sendPortfolioNotification(emailPayload),
        emailService.sendVisitorConfirmation(emailPayload)
      ]);

      let emailNotificationFailed = false;

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          emailNotificationFailed = true;
          serviceLogger.error(
            {
              messageId: savedMessage.id,
              emailType: index === 0 ? "notification" : "confirmation",
              error: result.reason instanceof Error ? result.reason.message : result.reason
            },
            "Email delivery failed"
          );
        }
      });

      return {
        id: savedMessage.id,
        emailNotificationFailed
      };
    }
  };
}
