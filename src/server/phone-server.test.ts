import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { Memory } from "../memory/memory.js";
import { Chat } from "../llm/chat.js";
import { Routine } from "../routine/routine.js";
import { createPhoneServer } from "./phone-server.js";
import { tokenMatches } from "./token.js";

// A fake "AI": instead of Ollama, the Chat's memory provider is all we need for commands,
// and for a real message we point Chat at a tiny fake Ollama server below.

const TOKEN = "test-token-123";
let base = "";
let server: ReturnType<typeof createPhoneServer>;
let dir = "";

/** POST /chat helper. */
async function chat(message: string, token = TOKEN): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "jarvis-srv-"));
  const memory = new Memory(join(dir, "memory.json"));
  // Chat is created but we only exercise command paths here (no real AI needed),
  // so the AI is never actually called in these tests.
  const routine = new Routine(join(dir, "routine.json"));
  const chatObj = new Chat(() => memory.asPromptText());
  server = createPhoneServer(memory, routine, chatObj, TOKEN);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

test("token helper rejects a wrong token and accepts the right one", () => {
  assert.equal(tokenMatches("abc", "abc"), true);
  assert.equal(tokenMatches("abc", "abcd"), false);
  assert.equal(tokenMatches("xxx", "abc"), false);
});

test("health check needs no token", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).ok, true);
});

test("no token is refused", async () => {
  const res = await fetch(`${base}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hi" }),
  });
  assert.equal(res.status, 401);
});

test("wrong token is refused", async () => {
  const { status } = await chat("hi", "wrong-token");
  assert.equal(status, 401);
});

test("a 'remember' command works over the phone and is saved", async () => {
  const { status, body } = await chat("remember I play chess");
  assert.equal(status, 200);
  assert.match(body.reply, /remember/i);
  // Reading it back through the same server proves it was saved.
  const list = await chat("memory");
  assert.match(list.body.reply, /I play chess/);
});

test("empty message is refused", async () => {
  const { status } = await chat("   ");
  assert.equal(status, 400);
});

test("GET /mission needs the token and returns a mission", async () => {
  const noAuth = await fetch(`${base}/mission`);
  assert.equal(noAuth.status, 401);
  const res = await fetch(`${base}/mission`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.mission, "string");
  assert.ok(body.mission.length > 0);
});
