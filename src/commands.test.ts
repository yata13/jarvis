import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Memory } from "./memory/memory.js";
import { handleCommand } from "./commands.js";

function tempMemory(): { memory: Memory; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-cmd-"));
  return { memory: new Memory(join(dir, "memory.json")), dir };
}

test("a normal message is not a command (returns null)", () => {
  const { memory, dir } = tempMemory();
  assert.equal(handleCommand("what is the weather", memory), null);
  rmSync(dir, { recursive: true, force: true });
});

test("'remember ...' saves a fact", () => {
  const { memory, dir } = tempMemory();
  const reply = handleCommand("remember I like football", memory);
  assert.match(reply ?? "", /remember/i);
  assert.equal(memory.all()[0].text, "I like football");
  rmSync(dir, { recursive: true, force: true });
});

test("'memory' lists facts with numbers", () => {
  const { memory, dir } = tempMemory();
  memory.add("fact one");
  const reply = handleCommand("memory", memory);
  assert.match(reply ?? "", /1\. fact one/);
  rmSync(dir, { recursive: true, force: true });
});

test("'forget 1' removes the first fact", () => {
  const { memory, dir } = tempMemory();
  memory.add("fact one");
  const reply = handleCommand("forget 1", memory);
  assert.match(reply ?? "", /Forgotten/);
  assert.equal(memory.all().length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("'forget abc' asks for a number instead of crashing", () => {
  const { memory, dir } = tempMemory();
  const reply = handleCommand("forget abc", memory);
  assert.match(reply ?? "", /number/);
  rmSync(dir, { recursive: true, force: true });
});
