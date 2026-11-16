import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The secret word that lets your phone talk to your PC.
 * It is made once and kept in a file. You type it into the phone app one time.
 * Anyone without it is refused, so a stranger on the network cannot use your JARVIS.
 */
export function loadOrCreateToken(file = "jarvis-data/phone-token.txt"): string {
  if (existsSync(file)) {
    const saved = readFileSync(file, "utf8").trim();
    if (saved) return saved;
  }
  const token = randomBytes(16).toString("hex"); // 32 letters/numbers, hard to guess
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, token);
  return token;
}

/** Safe compare: same length check and constant time, so no one can guess the token letter by letter. */
export function tokenMatches(given: string, real: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(real);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
