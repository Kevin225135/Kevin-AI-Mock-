import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [scheme, salt, storedHash] = passwordHash.split("$");
  if (scheme !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;
  const stored = Buffer.from(storedHash, "base64url");

  if (stored.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(stored, derivedKey);
}
