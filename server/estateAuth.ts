import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ESTATE_SESSION_COOKIE = "prestige_estates_session";
export const ADMIN_EMAIL = "ibrahimahmed@gmail.com";
export const ADMIN_PASSWORD = "ibrahim";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminCredential(email: string, password: string) {
  return normalizeEmail(email) === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
