import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// scrypt is a memory-hard KDF built into Node's standard library -- no
// external dependency (like bcrypt) needed. Stored format is "salt:hash",
// both hex-encoded, so verification just re-derives the hash with the same
// salt and compares in constant time.

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedHash = scryptSync(password, salt, KEYLEN);
  if (hashBuffer.length !== suppliedHash.length) return false;
  return timingSafeEqual(hashBuffer, suppliedHash);
}
