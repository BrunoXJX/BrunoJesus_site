import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "../config/env";

const TOKEN_SEPARATOR = ".";

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
}

function getEncryptionKey(): Buffer {
  return createHash("sha256").update(env.TOKEN_ENCRYPTION_KEY, "utf8").digest();
}

export function createSecretToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [base64UrlEncode(iv), base64UrlEncode(tag), base64UrlEncode(encrypted)].join(TOKEN_SEPARATOR);
}

export function decryptSecret(value: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split(TOKEN_SEPARATOR);

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted secret format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), base64UrlDecode(ivValue));
  decipher.setAuthTag(base64UrlDecode(tagValue));

  return Buffer.concat([
    decipher.update(base64UrlDecode(encryptedValue)),
    decipher.final()
  ]).toString("utf8");
}

export function encodeBase64Url(value: string): string {
  return base64UrlEncode(Buffer.from(value, "utf8"));
}
