import type { FastifyBaseLogger } from "fastify";
import { Resend } from "resend";

import { env } from "../config/env";
import type { PortfolioEmailPayload } from "../types/contact.types";

export interface EmailService {
  sendPortfolioNotification(payload: PortfolioEmailPayload): Promise<void>;
  sendVisitorConfirmation(payload: PortfolioEmailPayload): Promise<void>;
}

class ResendEmailService implements EmailService {
  private readonly client: Resend;
  private readonly logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.client = new Resend(env.RESEND_API_KEY);
    this.logger = logger.child({ service: "email" });
  }

  private getEmailDomain(email: string): string {
    return email.split("@")[1] ?? "unknown";
  }

  public async sendPortfolioNotification(payload: PortfolioEmailPayload): Promise<void> {
    const response = await this.client.emails.send({
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_RECEIVER_EMAIL,
      subject: `New portfolio contact - ${payload.name}`,
      text: [
        "New message from Bruno Jesus Portfolio",
        "",
        `Name: ${payload.name}`,
        `Email: ${payload.email}`,
        `Subject: ${payload.subject}`,
        "",
        "Message:",
        payload.message,
        "",
        `Source: ${payload.source}`,
        `Date: ${payload.createdAt.toISOString()}`
      ].join("\n")
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    this.logger.info(
      {
        emailType: "notification",
        emailId: response.data?.id,
        receiverConfigured: Boolean(env.CONTACT_RECEIVER_EMAIL)
      },
      "Email sent"
    );
  }

  public async sendVisitorConfirmation(payload: PortfolioEmailPayload): Promise<void> {
    const response = await this.client.emails.send({
      from: env.CONTACT_FROM_EMAIL,
      to: payload.email,
      subject: "Message received - Bruno Jesus",
      text: [
        `Hi ${payload.name},`,
        "",
        "Thank you for reaching out through my portfolio.",
        "",
        "I received your message and will get back to you as soon as possible.",
        "",
        "Best regards,",
        "Bruno Jesus"
      ].join("\n")
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    this.logger.info(
      {
        emailType: "confirmation",
        emailId: response.data?.id,
        recipientDomain: this.getEmailDomain(payload.email)
      },
      "Email sent"
    );
  }
}

export function createEmailService(logger: FastifyBaseLogger): EmailService {
  return new ResendEmailService(logger);
}
