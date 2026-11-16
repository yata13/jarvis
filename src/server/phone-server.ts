import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Memory } from "../memory/memory.js";
import type { Chat } from "../llm/chat.js";
import { respond } from "../assistant.js";
import { tokenMatches } from "./token.js";

/** The port the phone connects to. */
export const PHONE_PORT = 11435;

// Stop a huge or broken request from using all the memory.
const MAX_BODY_BYTES = 10_000;

/**
 * A small web server so the phone can chat with JARVIS on the PC.
 * It uses Node's built-in http, so there are no extra packages.
 * Only the phone that knows the token can use it.
 *
 * Returns the server so tests and the startup code can start and stop it.
 */
export function createPhoneServer(memory: Memory, chat: Chat, token: string) {
  return createServer((req, res) => {
    handle(req, res, memory, chat, token).catch((error) => {
      sendJson(res, 500, { error: String(error) });
    });
  });
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  memory: Memory,
  chat: Chat,
  token: string,
): Promise<void> {
  // A quick "are you alive?" check. No token needed, and it says nothing secret.
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { ok: true, name: "JARVIS" });
  }

  if (req.method !== "POST" || req.url !== "/chat") {
    return sendJson(res, 404, { error: "Not found. Use POST /chat." });
  }

  // Check the secret token from the phone.
  const auth = req.headers.authorization ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!given || !tokenMatches(given, token)) {
    return sendJson(res, 401, { error: "Wrong or missing token." });
  }

  let body: string;
  try {
    body = await readBody(req);
  } catch (error) {
    return sendJson(res, 413, { error: String(error) });
  }

  let message: string;
  try {
    message = String((JSON.parse(body) as { message?: unknown }).message ?? "").trim();
  } catch {
    return sendJson(res, 400, { error: "Body must be JSON like {\"message\":\"hi\"}." });
  }
  if (!message) return sendJson(res, 400, { error: "Message is empty." });

  const reply = await respond(message, memory, chat);
  return sendJson(res, 200, { reply: reply.text });
}

/** Read the request body, but stop if it is too big. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Message too long."));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
