export interface ValidationErrorItem {
  field: string;
  message: string;
}

export interface ContactCreateInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactRequestContext {
  source?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PortfolioEmailPayload extends ContactCreateInput {
  id: string;
  source: string;
  createdAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ContactSubmissionResult {
  id: string;
  emailNotificationFailed: boolean;
}
